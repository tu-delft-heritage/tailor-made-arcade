import { MAX_SCORE, type ScoreStorage } from './scoreboard.ts'
import type { Language } from './types.ts'

export const LANGUAGE_KEY = 'tailor-made-arcade:language:v1'
export const bestScoreKey = (language: Language) => `tailor-made-arcade:best:v3:${language}`

// The former name is used only to recover records saved before the rename.
const legacyLanguageKey = 'daphnes-arcade:language:v1'
const legacyBestScoreKey = (language: Language) => `daphnes-arcade:best:v3:${language}`
const isLanguage = (value: string | null): value is Language => value === 'nl' || value === 'en'

function validScore(raw: string | null) {
  if (!raw?.trim()) return undefined
  const score = Number(raw)
  return Number.isInteger(score) && score >= 0 && score <= MAX_SCORE ? score : undefined
}

export function migrateStoredPreferences(storage?: ScoreStorage) {
  if (!storage) return
  try {
    const current = storage.getItem(LANGUAGE_KEY)
    const legacy = storage.getItem(legacyLanguageKey)
    if (!isLanguage(current) && isLanguage(legacy)) storage.setItem(LANGUAGE_KEY, legacy)
  } catch { /* Browser storage is optional. */ }

  for (const language of ['nl', 'en'] as const) {
    try {
      const key = bestScoreKey(language)
      const current = validScore(storage.getItem(key))
      const legacy = validScore(storage.getItem(legacyBestScoreKey(language)))
      if (legacy !== undefined && (current === undefined || legacy > current)) {
        storage.setItem(key, String(legacy))
      }
    } catch { /* Leave existing records intact if storage is unavailable. */ }
  }
}
