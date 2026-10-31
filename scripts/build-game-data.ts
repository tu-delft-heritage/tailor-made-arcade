import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import type { Entity, FactField, GameData, GameObject, Language, LocalizedText } from '../src/lib/game/types.ts'
import { createQuestionBank, createSession, questionKinds } from '../src/lib/game/questions/index.ts'

const root = fileURLToPath(new URL('../', import.meta.url))
const read = async (file: string) => JSON.parse(await readFile(join(root, file), 'utf8'))
const records = await read('data/objects.json')
const { terms } = await read('data/vocabularies.json')
const professors: { name: string; objectId: string; quote: string }[] = await read('data/professors.json')
const clean = (text: string) => text.trim().replace(/\s+/g, ' ')
const key = (text: string) => clean(text).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
const canonical = (url: string) => url.replace(/^http:/, 'https:').replace(/\/$/, '')
const termByUrl = new Map(terms.map((term: any) => [canonical(term.url), term]))
const entities: Record<string, Entity> = {}
const idsByLabel = new Map<string, string>()

function entity(namespace: string, label: string, url?: string, bilingual = false): string {
  label = clean(label)
  const term: any = url ? termByUrl.get(canonical(url)) : undefined
  const labelKey = `${namespace}:${key(label)}`
  // Collection records can share titles; their relation identity must remain the source URI.
  const id = namespace === 'related' && url ? `${namespace}:${canonical(url)}`
    : idsByLabel.get(labelKey) ?? `${namespace}:${url ? canonical(url) : key(label)}`
  const labels: LocalizedText = { nl: label }
  if (bilingual) labels.en = label
  else if (term?.labels.en?.[0]) labels.en = term.labels.en[0]
  const aliases = [...new Set([label, ...Object.values(term?.labels ?? {}).flat(), ...Object.values(term?.aliases ?? {}).flat()] as string[])]
  if (!entities[id]) entities[id] = { id, labels, aliases, ...(url ? { source: url } : {}),
    ...(term ? { definition: Object.fromEntries(['nl', 'en'].flatMap(lang => term.descriptions[lang]?.[0] ? [[lang, clean(term.descriptions[lang][0])]] : [])) } : {}) }
  else entities[id].aliases = [...new Set([...entities[id].aliases, ...aliases])]
  for (const alias of aliases) idsByLabel.set(`${namespace}:${key(alias)}`, id)
  return id
}
const objects: GameObject[] = records.map((record: any) => {
  if (!record.type?.label || !record.images?.[0]?.thumbnail || !record.creators) throw new Error(`Incomplete normalized object ${record.id}; run pnpm data:prepare.`)
  const facts: Partial<Record<FactField, string[]>> = {}
  function add(field: FactField, ids: string[]) { if (ids.length) facts[field] = [...new Set(ids)] }
  const typeId = entity('type', record.type.label, record.type.url)
  add('type', [typeId])
  add('material', record.materials.filter((m: any) => m.label && !/verdacht|onbekend/i.test(m.label)).map((m: any) => entity('material', m.label, m.url)))
  for (const [role, field] of Object.entries({ maker: 'maker', ontwerper: 'designer', producent: 'manufacturer' })) {
    add(field as FactField, record.creators.filter((p: any) => p.role === role && p.label).map((p: any) => entity(p.kind === 'Person' ? 'person' : 'organization', p.label, p.url, true)))
  }
  add('depicted', record.depicted.filter((p: any) => p.kind === 'Person' && p.label).map((p: any) => entity('person', p.label, p.url, true)))
  // City names are proper names; no guessed country translations or geocoding.
  add('place', record.places.filter((p: any) => p.label).map((p: any) => entity('place', p.label.split(',')[0], p.url, true)))
  add('owner', record.contributors.filter((p: any) => p.role === 'had in bezit' && p.label).map((p: any) => entity(p.kind === 'Person' ? 'person' : 'organization', p.label, p.url, true)))
  if (/^\d{4}(\/\d{4})?$/.test(record.date)) add('date', [entity('date', record.date.replace('/', '–'), undefined, true)])
  const units: Record<string, number> = { MMT: 1, CMT: 10, MTR: 1000 }
  for (const field of ['height', 'width', 'depth'] as const) {
    const dimension = record.dimensions[field]
    const mm = Number(dimension?.value) * units[dimension?.unitCode]
    if (Number.isFinite(mm) && mm > 0) add(field, [entity(field, `${Number(mm.toFixed(2))} mm`, undefined, true)])
  }
  // Preserve every relation in the snapshot; only concise, resolvable labels enter the game.
  add('related', record.related.filter((r: any) => r.id && r.id !== record.id && records.some((o: any) => o.id === r.id) && r.label?.length <= 80).map((r: any) => entity('related', r.label, `https://heritage.tudelft.nl/iiif/manifests/${r.id}/schema.json`)))
  const professorIds = record.creators.filter((p: any) => p.kind === 'Person').flatMap((p: any) => {
    const annotation = professors.find(item => key(item.name) === key(p.label))
    if (!annotation) return []
    const source = records.find((r: any) => r.id === annotation.objectId)
    if (!source?.description.includes(annotation.quote) || !/hoogleraar|prof\./i.test(annotation.quote)) throw new Error(`Invalid professor evidence: ${annotation.name}`)
    const id = entity('person', p.label, p.url, true)
    entities[id].professorEvidence = { objectId: annotation.objectId, quote: annotation.quote }
    return [id]
  })
  add('professor', professorIds)
  return { id: record.id, title: record.title, identifier: record.identifier,
    description: { nl: record.description }, type: entities[typeId].labels,
    imageRemote: record.images[0].thumbnail,
    // Descriptive titles/old prototype alt text can disclose the answer in several modules.
    imageAlt: { nl: 'Collectiefoto van het object', en: 'Collection photograph of the object' },
    source: record.source, date: record.date, materials: record.materials.map((m: any) => m.label),
    vocabularyUrl: record.type.url, facts }
})
const data: GameData = { version: 3, entities, objects }
const json = JSON.stringify(data) + '\n'
const coverage: Record<string, unknown> = {}
for (const language of ['nl', 'en'] as Language[]) {
  const bank = createQuestionBank(data, language)
  const eligibleIds = new Set(bank.flatMap(q => (q.photos ?? [q.object]).map(o => o.id)))
  coverage[language] = { questions: bank.length, eligibleObjects: eligibleIds.size,
    byKind: Object.fromEntries(questionKinds.map(kind => [kind, bank.filter(q => q.kind === kind).length])),
    excludedObjects: objects.filter(o => !eligibleIds.has(o.id)).map(o => o.id),
    exclusions: bank.exclusions,
    preview: questionKinds.flatMap(kind => { const q = bank.find(q => q.kind === kind); return q ? [{ kind, prompt: q.prompt, clue: q.clue,
      objectIds: (q.photos ?? [q.object]).map(o => o.id), imageUrls: (q.photos ?? [q.object]).map(o => o.imageRemote), choices: q.choices, answer: q.answer, explanation: q.explanation, evidence: q.evidence }] : [] }) }
  if (createSession(bank, 42, 10).length !== 10) throw new Error(`Insufficient ${language} question pool`)
}
await mkdir(join(root, 'src/lib/data'), { recursive: true })
await writeFile(join(root, 'src/lib/data/game-data.json'), json)
await mkdir(join(root, '.cache/reports'), { recursive: true })
await writeFile(join(root, '.cache/reports/question-coverage.json'), JSON.stringify({ version: 3, objects: objects.length,
  runtimeBytes: Buffer.byteLength(json), gzipBytes: gzipSync(json).length, coverage,
  fieldPolicy: { identifier: 'Record identity and reveal evidence, not a trivia question.', citations: 'Preserved for provenance, not a trivia question.',
    image: 'Question photographs; duplicate image URLs excluded within sessions.', description: 'Reveal context and reviewed professor evidence.',
    about: 'Person questions restricted to visual portraits, busts, medals and plaques.',
    temporalCoverage: 'Catalogue dating; ranges kept intact, overlapping date distractors rejected.',
    dimensions: 'Positive known units converted to mm; invalid or missing measurements excluded.',
    isRelatedTo: 'Recorded links only; unknown, self and overlong labels excluded. English excluded without translated titles.',
    professor: 'Requires both an explicit creator role and reviewed evidence of a (possibly later) professorship.',
    oddOneOut: 'Four explicitly dated objects; three within one 100-year period, one wholly outside it.',
    definitions: 'Linked vocabulary wording only; short excerpts with answer/alias leakage excluded.' }
}, null, 2) + '\n')
console.log(`Built ${objects.length} objects, ${Object.keys(entities).length} entities; ${Math.ceil(gzipSync(json).length / 1024)} KiB gzip.`)
for (const [lang, stats] of Object.entries(coverage)) console.log(lang, JSON.stringify({ ...(stats as any), preview: undefined, exclusions: undefined, excludedObjects: undefined }))
console.log('Question coverage: .cache/reports/question-coverage.json')
