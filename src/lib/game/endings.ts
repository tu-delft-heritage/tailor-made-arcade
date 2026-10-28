import { roundRules } from './scoring.ts'
import type { GameOverReason, Language, RoundResult } from './types.ts'

type Performance = {
  results: RoundResult[]
  score: number
  roundStartScore: number
  level: number
  questionCount: number
  gameOverReason: GameOverReason | null
}

const victories = {
  fast: 'Every label right, quick as a flash! Mighty work, mate!',
  perfect: 'Every label home. That’s grand work, mate!',
  strong: 'Excellent work mate! You’ve a great eye for this.',
  close: 'A close one, mate! You kept going. That’s the spirit!',
  nextRound: 'Less time, more pressure. You’re flying, mate!',
  steady: 'A few wobbles, a fine finish. On we go, mate!'
}

const setbacks = {
  image: {
    nl: 'Eerst de labels, nu de foto’s. Ik regel het wel weer.',
    en: 'First the labels, now the photos. I’ll sort it out. Again.'
  },
  noCorrect: {
    nl: 'Ik vroeg om orde. Mijn minions maken er confetti van.',
    en: 'I asked for order. My minions made confetti.'
  },
  nearMiss: {
    nl: 'Zó dichtbij. Moet ik dan echt ieder label controleren?',
    en: 'So close. Must I really check every label myself?'
  },
  mistakes: {
    nl: 'Weer te veel fouten. Ik kan je wel achter het behang plakken!',
    en: 'Too many mistakes. This team is driving me up the wall!'
  },
  late: {
    nl: 'Bijna klaar… en dan klokslag chaos. Typisch mijn minions.',
    en: 'Nearly finished… then chaos on the dot. Typical of my minions.'
  },
  slowStart: {
    nl: 'Mijn team is er klaar voor. Behalve om te beginnen.',
    en: 'My team is ready for anything. Except getting started.'
  },
  questionTime: {
    nl: 'Ik moet blijkbaar zowel labels als personeel bijhouden.',
    en: 'Apparently I must keep track of the labels AND the staff.'
  },
  gameTime: {
    nl: 'De klok wacht niet op mijn minions. Ik dus ook niet.',
    en: 'The clock won’t wait for my minions. Neither will I.'
  }
} satisfies Record<string, Record<Language, string>>

/** Deterministic selection keeps a line stable while an ending is on screen. */
export function endingQuote(performance: Performance, language: Language): string {
  const { results, score, roundStartScore, level, questionCount, gameOverReason } = performance
  const correct = results.filter(result => result === 'correct').length
  const wrong = results.filter(result => result === 'wrong').length
  const accuracy = results.length ? correct / results.length : 0
  const rules = roundRules(level)

  if (gameOverReason) {
    if (gameOverReason === 'image') return setbacks.image[language]
    if (gameOverReason === 'mistakes') {
      if (accuracy >= 0.7) return setbacks.nearMiss[language]
      return setbacks[correct === 0 ? 'noCorrect' : 'mistakes'][language]
    }
    if (questionCount > 0 && results.length / questionCount >= 0.8) return setbacks.late[language]
    if (correct === 0) return setbacks.slowStart[language]
    return setbacks[gameOverReason === 'question-time' ? 'questionTime' : 'gameTime'][language]
  }

  // Cormac's spoken lines stay in English in both interface languages.
  if (questionCount > 0 && correct === questionCount) {
    const roundScore = score - roundStartScore
    return roundScore >= correct * 175 * rules.multiplier ? victories.fast : victories.perfect
  }
  if (wrong > 0 && wrong === rules.maxMistakes) return victories.close
  if (accuracy >= 0.8) return victories.strong
  return level > 1 ? victories.nextRound : victories.steady
}
