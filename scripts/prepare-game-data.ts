import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listFiles } from './fetch-iiif.ts'

const root = fileURLToPath(new URL('../', import.meta.url))
const source = join(root, '.cache/iiif/schemas')
const selection: { id: string }[] = JSON.parse(await readFile(join(root, 'data/game-selection.json'), 'utf8'))
const selected = new Set(selection.map(item => item.id))
const values = (value: any) => value == null ? [] : Array.isArray(value) ? value : [value]
const records = []
const files = (await listFiles(source)).filter(file => file.endsWith('/schema.json'))

for (const file of files) {
  const schema = JSON.parse(await readFile(join(source, file), 'utf8'))
  const id = file.split('/').at(-2)!
  records.push({
    id, title: schema.name, description: schema.description ?? '', identifier: schema.identifier,
    type: { label: schema.exampleOfWork?.name ?? '', url: schema.exampleOfWork?.sameAs ?? null },
    date: schema.temporalCoverage ?? null,
    materials: values(schema.material).map((item: any) => ({ label: item.name, url: item.sameAs ?? null })),
    images: values(schema.image).map((item: any) => ({ thumbnail: item.thumbnailUrl,
      service: item.contentUrl?.['@id'] ?? null })),
    creators: values(schema.creator).flatMap((role: any) => values(role.creator).map((item: any) => ({
      role: role.roleName, kind: item['@type'], label: item.name, url: item.sameAs ?? null
    }))),
    places: values(schema.locationCreated).map((item: any) => ({ label: item.address, url: item.sameAs ?? null })),
    depicted: values(schema.about).map((item: any) => ({ kind: item['@type'], label: item.name, url: item.sameAs ?? null })),
    contributors: values(schema.contributor).flatMap((role: any) => values(role.contributor).map((item: any) => ({
      role: role.roleName, kind: item['@type'], label: item.name, url: item.sameAs ?? null
    }))),
    dimensions: Object.fromEntries(['height', 'width', 'depth'].map(key => [key, schema[key]])),
    related: values(schema.isRelatedTo).map((item: any) => ({ id: item.sameAs?.split('/').at(-2), label: item.name, identifier: item.identifier })),
    citations: values(schema.citation),
    source: schema['@id']
  })
}
records.sort((a, b) => a.id.localeCompare(b.id))
for (const id of selected) {
  const record = records.find(record => record.id === id)
  if (!record?.images[0]?.thumbnail) throw new Error(`Selected object has no image reference: ${id}`)
}
const { terms } = JSON.parse(await readFile(join(root, 'data/vocabularies.json'), 'utf8'))
const upstream = JSON.parse(await readFile(join(root, '.cache/iiif/index.json'), 'utf8'))
await writeFile(join(root, 'data/objects.json'), JSON.stringify(records, null, 2) + '\n')
await writeFile(join(root, 'data/data-quality.json'), JSON.stringify({
  upstreamCommit: upstream.commit,
  objects: records.length,
  withType: records.filter(item => item.type.label).length,
  withImageReference: records.filter(item => item.images[0]?.thumbnail).length,
  uniqueTypeLabels: new Set(records.map(item => item.type.label)).size,
  vocabularyDefinitions: { nl: terms.filter((term: any) => term.descriptions.nl?.length).length,
    en: terms.filter((term: any) => term.descriptions.en?.length).length },
  prototypeObjects: selection.length,
  selectedImageReferences: records.filter(record => selected.has(record.id)).map(record => ({
    id: record.id, url: record.images[0].thumbnail
  })),
  exclusions: [{ url: 'http://www.wikidata.org/entity/Q138148494', reason: 'Upstream 404; skipped until the source is corrected.' }],
  note: 'Images are referenced only. Use pnpm cache:images to create an ignored local cache.'
}, null, 2) + '\n')
console.log(`Prepared ${records.length} object records and ${selection.length} selected image references.`)
