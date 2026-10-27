export type Language = 'nl' | 'en'
export const characterIds = ['charlotte', 'daphne', 'anna', 'liselotte', 'isabel', 'cormac', 'catherine', 'elin', 'karin', 'jill'] as const
export type CharacterId = typeof characterIds[number]
export type LocalizedText = Partial<Record<Language, string>>
export const factFields = ['type', 'material', 'maker', 'designer', 'manufacturer', 'place', 'depicted', 'professor', 'date', 'height', 'width', 'depth', 'owner', 'related'] as const
export type FactField = typeof factFields[number]
export type Entity = {
  id: string
  labels: LocalizedText
  aliases: string[]
  source?: string
  definition?: LocalizedText
  professorEvidence?: { objectId: string; quote: string }
}
export type GameObject = {
  id: string
  title: string
  description: LocalizedText
  identifier: string
  type: LocalizedText
  imageRemote: string
  imageAlt: LocalizedText
  source: string
  date: string | null
  materials: string[]
  vocabularyUrl: string | null
  facts: Partial<Record<FactField, string[]>>
}
export type GameData = { version: number; objects: GameObject[]; entities: Record<string, Entity> }
export type QuestionKind = 'identify-object' | Exclude<FactField, 'type'> | 'definition-detective' | 'odd-one-out'
export type Question = {
  id: string
  kind: QuestionKind
  object: GameObject
  language: Language
  prompt: string
  choices: string[]
  answer: string
  explanation: string
  evidence: { objectId: string; field: string; values: string[]; source: string }[]
  clue?: string
  photos?: GameObject[]
  seconds: number
}
export type RoundResult = 'correct' | 'wrong' | 'timeout'
export type GameOverReason = 'question-time' | 'game-time' | 'image'
