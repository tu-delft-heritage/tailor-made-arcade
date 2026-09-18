import { factFields, type Entity, type FactField, type GameData, type Language, type Question, type QuestionKind } from '../types.ts'
import { hash, randomSource, shuffle } from './random.ts'

export const prompts: Record<FactField, Record<Language, string>> = {
  type: { nl: 'Welk objecttype staat op dit collectielabel?', en: 'Which object type belongs on this label?' },
  material: { nl: 'Welk materiaal staat bij dit object vermeld?', en: 'Which material is recorded for this object?' },
  maker: { nl: 'Wie staat vermeld als maker van dit object?', en: 'Who is recorded as the maker of this object?' },
  designer: { nl: 'Wie heeft dit object ontworpen?', en: 'Who designed this object?' },
  manufacturer: { nl: 'Wie heeft dit object geproduceerd?', en: 'Who manufactured this object?' },
  place: { nl: 'Waar is dit object gemaakt?', en: 'Where was this object made?' },
  depicted: { nl: 'Wie is hier afgebeeld?', en: 'Who is depicted here?' },
  professor: { nl: 'Welke (latere) hoogleraar werkte aan dit object?', en: 'Which (later) professor helped create this object?' },
  date: { nl: 'Uit welk jaar of welke periode dateert dit object?', en: 'What year or period is this object dated to?' },
  height: { nl: 'Welke hoogte staat op het collectielabel?', en: 'What height is recorded for this object?' },
  width: { nl: 'Welke breedte staat op het collectielabel?', en: 'What width is recorded for this object?' },
  depth: { nl: 'Welke diepte staat op het collectielabel?', en: 'What depth is recorded for this object?' },
  owner: { nl: 'Wie had dit object volgens de collectie in bezit?', en: 'Who previously owned this object, according to the record?' },
  related: { nl: 'Welk object is in de catalogus hieraan gekoppeld?', en: 'Which object is linked to this one in the catalogue?' }
}
export const fieldLabels: Record<FactField, Record<Language, string>> = {
  type: { nl: 'Objecttype', en: 'Object type' }, material: { nl: 'Materiaal', en: 'Material' },
  maker: { nl: 'Maker', en: 'Maker' }, designer: { nl: 'Ontwerper', en: 'Designer' }, manufacturer: { nl: 'Producent', en: 'Manufacturer' },
  place: { nl: 'Vervaardigingsplaats', en: 'Place of creation' }, depicted: { nl: 'Afgebeeld', en: 'Depicted person' },
  professor: { nl: 'Hoogleraar betrokken bij de vervaardiging', en: 'Professor involved in creation' },
  date: { nl: 'Datering', en: 'Dating' }, height: { nl: 'Hoogte', en: 'Height' }, width: { nl: 'Breedte', en: 'Width' },
  depth: { nl: 'Diepte', en: 'Depth' }, owner: { nl: 'Voormalig eigenaar', en: 'Previous owner' }, related: { nl: 'Gekoppeld object', en: 'Linked object' }
}
export const sourceFields: Record<FactField, string> = { type: 'exampleOfWork', material: 'material', maker: 'creator:maker',
  designer: 'creator:ontwerper', manufacturer: 'creator:producent', place: 'locationCreated', depicted: 'about',
  professor: 'creator + reviewed professor evidence', date: 'temporalCoverage', height: 'height', width: 'width', depth: 'depth',
  owner: 'contributor:had in bezit', related: 'isRelatedTo' }
export const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
const stem = (text: string) => normalize(text.replace(/\([^)]*\)/g, '')).replace(/(en|es|s)$/, '')
const stems = new WeakMap<Entity, string[]>()
const entityStems = (entity: Entity) => {
  if (!stems.has(entity)) stems.set(entity, entity.aliases.map(stem))
  return stems.get(entity)!
}
/** Conservative alias/specificity filter; catalogue facts are never inferred from missing values. */
export function confusable(a: Entity, b: Entity): boolean {
  if (a.id === b.id) return true
  return entityStems(a).some(x => entityStems(b).some(y => {
    return x === y || (Math.min(x.length, y.length) >= 4 && (x.includes(y) || y.includes(x)))
  }))
}
export function dateRange(value: string): [number, number] | null {
  if (!/^\d{4}([/–]\d{4})?$/.test(value)) return null
  const [start, end = start] = value.split(/[/–]/).map(Number)
  return start <= end ? [start, end] : null
}
export function rangesOverlap(a: string, b: string) {
  const x = dateRange(a), y = dateRange(b)
  return !x || !y || x[0] <= y[1] && y[0] <= x[1]
}
export type QuestionBank = Question[] & { exclusions: Record<string, number> }
export function metadataQuestions(data: GameData, language: Language): QuestionBank {
  const bank = [] as unknown as QuestionBank
  bank.exclusions = {}
  const exclude = (reason: string) => { bank.exclusions[reason] = (bank.exclusions[reason] ?? 0) + 1 }
  const pools = Object.fromEntries(factFields.map(field => [field, [...new Set(data.objects.flatMap(o => o.facts[field] ?? []))]
    .map(id => data.entities[id]).filter(e => e?.labels[language])])) as Record<FactField, Entity[]>
  for (const object of data.objects) for (const field of factFields) {
    const ids = object.facts[field] ?? []
    if (!ids.length) { exclude(`${field}: missing/invalid source value`); continue }
    if (field === 'depicted' && !/schilderij|buste|penning|plaquette|foto|portret/i.test(object.type.nl ?? '')) { exclude('depicted: non-portrait object'); continue }
    const correctEntities = ids.map(id => data.entities[id]).filter(Boolean)
    const eligible = correctEntities.filter(e => e.labels[language])
    if (!eligible.length) { exclude(`${field}: no ${language} label`); continue }
    const random = randomSource(hash(`${object.id}:${field}:${language}`))
    const answerEntity = shuffle(eligible, random)[0]
    const answer = answerEntity.labels[language]!
    const candidates = shuffle(pools[field], random).filter(candidate => {
      if (correctEntities.some(correct => confusable(correct, candidate))) return false
      const label = candidate.labels[language]!
      if (field === 'date' && rangesOverlap(answer, label)) return false
      if (['height', 'width', 'depth'].includes(field)) {
        const a = parseFloat(answer), b = parseFloat(label)
        if (b / a < 0.2 || b / a > 5 || Math.abs(a - b) < a * 0.2) return false
      }
      // People with matching surnames/initial variants cannot be competing options.
      if (['maker', 'designer', 'depicted', 'professor', 'owner'].includes(field) && correctEntities.some(e =>
        normalize(e.labels[language]!.split(' ').at(-1)!) === normalize(label.split(' ').at(-1)!))) return false
      return true
    })
    const distractors: Entity[] = []
    for (const candidate of candidates) {
      if (!distractors.some(d => confusable(d, candidate))) distractors.push(candidate)
      if (distractors.length === 3) break
    }
    if (distractors.length < 3) { exclude(`${field}: fewer than three unambiguous distractors`); continue }
    const kind: QuestionKind = field === 'type' ? 'identify-object' : field
    const labels = eligible.map(e => e.labels[language]).join('; ')
    let prompt = prompts[field][language]
    if (field === 'depicted' && object.type.nl === 'schilderij') prompt = language === 'nl' ? 'Wie is afgebeeld op dit schilderij?' : 'Who is depicted in this painting?'
    const roleNames = (['maker', 'designer', 'manufacturer'] as const).filter(role => object.facts[role]?.includes(answerEntity.id)).map(role => fieldLabels[role][language].toLowerCase())
    const detail = field === 'professor' ? `${answer} — ${roleNames.join(', ')}.` : `${fieldLabels[field][language]}: ${labels}.`
    bank.push({ id: `${kind}:${object.id}`, kind, object, language, prompt,
      choices: shuffle([answer, ...distractors.map(e => e.labels[language]!)], random), answer,
      explanation: `${language === 'nl' ? 'Collectierecord' : 'Collection record'} ${object.identifier}. ${detail}`,
      evidence: [{ objectId: object.id, field: sourceFields[field], values: ids, source: object.source },
        ...(field === 'professor' && answerEntity.professorEvidence ? [{ objectId: answerEntity.professorEvidence.objectId,
          field: 'description:professorship', values: [answerEntity.professorEvidence.quote], source: data.objects.find(o => o.id === answerEntity.professorEvidence!.objectId)!.source }] : [])],
      seconds: 20 })
  }
  return bank
}
