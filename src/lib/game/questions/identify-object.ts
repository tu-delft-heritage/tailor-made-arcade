import type { GameObject, IdentificationQuestion, Language } from '../types.ts'

function randomSource(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function shuffle<T>(values: T[], random: () => number) {
  for (let index = values.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[values[index], values[other]] = [values[other], values[index]]
  }
  return values
}

export function supportsLanguage(object: GameObject, language: Language) {
  return Boolean(object.type[language] && object.description[language] && object.imageAlt[language])
}

export function createIdentificationQuestion(
  object: GameObject,
  objects: GameObject[],
  seed: number,
  language: Language
): IdentificationQuestion {
  const answer = object.type[language]
  if (!answer) throw new Error(`Object ${object.id} is not available in ${language}.`)
  const distractors = [...new Set(objects
    .filter(candidate => candidate.id !== object.id && supportsLanguage(candidate, language))
    .map(candidate => candidate.type[language])
    .filter((label): label is string => Boolean(label) && label !== answer))]
  if (distractors.length < 3) throw new Error(`At least four distinct ${language} object types are required.`)
  const random = randomSource(seed)
  const choices = shuffle([answer, ...shuffle(distractors, random).slice(0, 3)], random)
  return { kind: 'identify-object', object, language, choices, answer }
}

export function createIdentificationSession(
  objects: GameObject[],
  seed: number,
  language: Language,
  count = 8
): IdentificationQuestion[] {
  const eligible = objects.filter(object => supportsLanguage(object, language))
  if (eligible.length < count) throw new Error(`Only ${eligible.length} ${language} questions are available; ${count} required.`)
  const random = randomSource(seed)
  const remaining = shuffle([...eligible], random)
  const selected: GameObject[] = []
  while (selected.length < count) {
    const previousType = selected.at(-1)?.type[language]
    let index = remaining.findIndex(object => object.type[language] !== previousType)
    if (index < 0) index = 0
    selected.push(remaining.splice(index, 1)[0])
  }
  return selected.map((object, index) => createIdentificationQuestion(object, eligible, (seed + index * 2654435761) >>> 0, language))
}
