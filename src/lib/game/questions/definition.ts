import type { Entity, GameData, Language, Question } from '../types.ts'
import { confusable, normalize } from './metadata.ts'
import { hash, randomSource, shuffle } from './random.ts'

// One-character source typos must not turn a named answer into an eligible clue.
function oneEditApart(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0, j = 0, edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++edits > 1) return false
    if (a.length >= b.length) i++
    if (b.length >= a.length) j++
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}
export function mentionsEntity(clue: string, entity: Entity): boolean {
  const normalized = normalize(clue)
  const words = clue.split(/\s+/).map(normalize)
  return entity.aliases.some(alias => {
    const bare = alias.replace(/\([^)]*\)/g, '').trim()
    const word = normalize(bare).replace(/(en|es|s)$/, '')
    if (word.length >= 3 && normalized.includes(word)) return true
    const count = bare.split(/\s+/).length
    return word.length >= 6 && words.some((_, index) =>
      oneEditApart(word, words.slice(index, index + count).join('').replace(/(en|es|s)$/, '')))
  })
}
export function definitionClue(entity: Entity, language: Language): string | undefined {
  const definition = entity.definition?.[language]
  if (!definition) return
  const clue = definition.split(/(?<=[.!?])\s+/)[0]
  if (clue.length < 40 || clue.length > 300 || mentionsEntity(clue, entity)) return
  return clue
}
export function definitionQuestions(data: GameData, language: Language): Question[] {
  const types = [...new Set(data.objects.flatMap(o => o.facts.type ?? []))].map(id => data.entities[id]).filter(e => e.labels[language])
  return data.objects.flatMap(object => {
    const entity = data.entities[object.facts.type?.[0] ?? '']
    const clue = entity && definitionClue(entity, language)
    const answer = entity?.labels[language]
    if (!clue || !answer) return []
    const random = randomSource(hash(`definition:${object.id}:${language}`))
    const distractors: Entity[] = []
    for (const candidate of shuffle(types, random)) {
      if (confusable(entity, candidate) || distractors.some(e => confusable(e, candidate))) continue
      // A clue mentioning a competing term is not used with that distractor.
      if (mentionsEntity(clue, candidate)) continue
      distractors.push(candidate)
      if (distractors.length === 3) break
    }
    if (distractors.length < 3) return []
    return [{ id: `definition:${object.id}`, kind: 'definition-detective', object, language,
      prompt: language === 'nl' ? 'Welk objecttype past bij deze definitie?' : 'Which object type matches this definition?',
      clue, answer, answerObjectId: object.id, choices: shuffle([answer, ...distractors.map(e => e.labels[language]!)], random),
      explanation: `${object.title}\n${language === 'nl' ? 'Collectierecord' : 'Collection record'} ${object.identifier}\n${language === 'nl' ? 'Definitie uit de gekoppelde erfgoedwoordenlijst.' : 'Definition from the linked heritage vocabulary.'} ${clue}`,
      evidence: [{ objectId: object.id, field: 'exampleOfWork:linked-definition', values: [entity.id], source: entity.source! }], seconds: 30 } satisfies Question]
  })
}
