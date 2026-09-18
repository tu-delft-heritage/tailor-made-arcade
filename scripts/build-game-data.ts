import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const records = JSON.parse(await readFile(join(root, 'data/objects.json'), 'utf8'))
const selection: { id: string; alt: { nl: string; en?: string } }[] = JSON.parse(
  await readFile(join(root, 'data/game-selection.json'), 'utf8')
)
const { terms } = JSON.parse(await readFile(join(root, 'data/vocabularies.json'), 'utf8'))
const canonical = (url: string) => url.replace(/^http:/, 'https:').replace(/\/$/, '')

const objects = selection.map(item => {
  const record = records.find((candidate: any) => candidate.id === item.id)
  if (!record?.type.label || !record.images[0]?.thumbnail) throw new Error(`Incomplete object ${item.id}`)
  const term = terms.find((candidate: any) => record.type.url && canonical(candidate.url) === canonical(record.type.url))
  const englishType = term?.labels.en?.[0]
  const englishDescription = term?.descriptions.en?.[0]
  return {
    id: record.id,
    title: record.title,
    description: { nl: record.description, ...(englishDescription && item.alt.en ? { en: englishDescription } : {}) },
    identifier: record.identifier,
    type: { nl: record.type.label, ...(englishType && englishDescription && item.alt.en ? { en: englishType } : {}) },
    imageRemote: record.images[0].thumbnail,
    imageAlt: item.alt,
    source: record.source,
    date: record.date,
    materials: record.materials.map((material: any) => material.label),
    vocabularyUrl: term?.url ?? null
  }
})

const counts = {
  nl: objects.filter(object => object.type.nl && object.description.nl && object.imageAlt.nl).length,
  en: objects.filter(object => object.type.en && object.description.en && object.imageAlt.en).length
}
if (counts.nl < 8 || counts.en < 8) throw new Error(`Eight questions are required per language; found nl=${counts.nl}, en=${counts.en}.`)
await mkdir(join(root, 'src/lib/data'), { recursive: true })
await writeFile(join(root, 'src/lib/data/game-data.json'), JSON.stringify({ version: 2, counts, objects }) + '\n')
console.log(`Built ${objects.length} objects (${counts.nl} Dutch, ${counts.en} English-ready).`)
