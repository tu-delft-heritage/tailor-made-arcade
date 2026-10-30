import { randomSource, shuffle } from './questions/random.ts'

export const victoryScenes = ['motorcycle', 'ejection-seat', 'mars-rover', 'aircraft'] as const
export type VictoryScene = typeof victoryScenes[number]

/** Show every scene before reshuffling, without a repeat across deck boundaries. */
export function createVictoryDeck(seed: number, previous?: VictoryScene): VictoryScene[] {
  const deck = shuffle(victoryScenes, randomSource(seed))
  if (deck[0] === previous) [deck[0], deck[1]] = [deck[1], deck[0]]
  return deck
}
