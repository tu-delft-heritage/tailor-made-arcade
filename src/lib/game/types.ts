export type Language = 'nl' | 'en'
export type LocalizedText = Partial<Record<Language, string>>

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
}

export type IdentificationQuestion = {
  kind: 'identify-object'
  object: GameObject
  language: Language
  choices: string[]
  answer: string
}

export type RoundResult = 'correct' | 'wrong' | 'timeout'
export type GameOverReason = 'question-time' | 'game-time' | 'image'
