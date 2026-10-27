import { characterIds, type CharacterId } from './types.ts'

export const SCOREBOARD_KEY = 'tailor-made-arcade:scoreboard:v1'
export const MAX_SCORE = Number.MAX_SAFE_INTEGER
export type Scoreboard = Record<CharacterId, number>
export type ScoreStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void }
const validScore = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_SCORE

export const isNewHighScore = (score: number, previous: number) => validScore(score) && score > previous

export function parseScoreboard(raw: string | null): Scoreboard {
  let saved: Record<string, unknown> = {}
  try {
    const value: unknown = JSON.parse(raw ?? '{}')
    if (value && typeof value === 'object' && !Array.isArray(value)) saved = value as Record<string, unknown>
  } catch { /* A damaged local record starts empty. */ }
  return Object.fromEntries(characterIds.map(id => [id, validScore(saved[id]) ? saved[id] : 0])) as Scoreboard
}

export function readScoreboard(storage?: ScoreStorage): Scoreboard {
  try { return parseScoreboard(storage?.getItem(SCOREBOARD_KEY) ?? null) }
  catch { return parseScoreboard(null) }
}

export function recordHighScore(current: Scoreboard, id: CharacterId, score: number, storage?: ScoreStorage): Scoreboard {
  const saved = readScoreboard(storage)
  const next = Object.fromEntries(characterIds.map(member => [member, Math.max(current[member], saved[member])])) as Scoreboard
  if (validScore(score) && characterIds.includes(id)) next[id] = Math.max(next[id], score)
  try { storage?.setItem(SCOREBOARD_KEY, JSON.stringify(next)) } catch { /* Keep the record for this visit if storage is unavailable. */ }
  return next
}
