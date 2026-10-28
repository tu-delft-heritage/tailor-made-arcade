import type { Question } from './types.ts'

export const GAME_SECONDS = 240
export const QUESTION_SECONDS = 20
export const FIRST_ROUND_MAX_SCORE = 2000

export function roundRules(level: number) {
  const roundsWon = Math.max(0, Math.floor(level) - 1)
  const timeFactor = Math.max(0.4, 0.85 ** roundsWon)
  return { timeFactor, totalSeconds: Math.round(GAME_SECONDS * timeFactor), multiplier: 1 + roundsWon * 0.25,
    maxMistakes: Math.max(0, 5 - roundsWon) }
}

export function questionForLevel(question: Question, level: number): Question {
  return { ...question, seconds: Math.round(question.seconds * roundRules(level).timeFactor) }
}

/** Time is measured from photo readiness; reveal/loading time never earns or loses points. */
export function answerPoints(correct: boolean, remainingMilliseconds: number, seconds: number, level: number): number {
  if (!correct) return 0
  const fraction = Number.isFinite(remainingMilliseconds) && seconds > 0
    ? Math.max(0, Math.min(1, remainingMilliseconds / (seconds * 1000))) : 0
  return Math.round((100 + Math.floor(fraction * 100)) * roundRules(level).multiplier)
}
