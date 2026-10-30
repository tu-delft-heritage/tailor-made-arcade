import { randomSource, shuffle } from './questions/random.ts'

export const bossScenes = ['instruments', 'switchboard', 'archive', 'aviation', 'laboratory'] as const
export type BossScene = typeof bossScenes[number]

/** Rotate through every game-over artwork before repeating, including between decks. */
export function createBossDeck(seed: number, previous?: BossScene): BossScene[] {
  const deck = shuffle(bossScenes, randomSource(seed))
  if (deck[0] === previous) [deck[0], deck[1]] = [deck[1], deck[0]]
  return deck
}
