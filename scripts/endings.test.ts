import assert from 'node:assert/strict'
import { test } from 'node:test'
import { endingQuote } from '../src/lib/game/endings.ts'
import type { GameOverReason, RoundResult } from '../src/lib/game/types.ts'

const results = (correct: number, wrong = 0): RoundResult[] => [...Array<RoundResult>(correct).fill('correct'), ...Array<RoundResult>(wrong).fill('wrong')]
const performance = (correct: number, wrong = 0, level = 1, score = correct * 100, gameOverReason: GameOverReason | null = null) => ({
  results: results(correct, wrong), score, level, gameOverReason, questionCount: 10
})

test('victory lines distinguish speed, accuracy, narrow wins and harder rounds', () => {
  const perfect = endingQuote(performance(10), 'en')
  const fast = endingQuote(performance(10, 0, 1, 1800), 'en')
  const strong = endingQuote(performance(8, 2), 'en')
  const close = endingQuote(performance(5, 5), 'en')
  const steady = endingQuote(performance(7, 3), 'en')
  const harder = endingQuote(performance(7, 3, 2), 'en')
  assert.equal(new Set([perfect, fast, strong, close, steady, harder]).size, 6)
  assert.match(fast, /quick/)
  assert.match(close, /close/i)
  assert.equal(endingQuote(performance(10, 0, 2, 2250), 'en'), fast, 'speed is normalized for the round multiplier')
  assert.equal(endingQuote(performance(10, 0, 2, 1800), 'en'), perfect, 'higher round points alone do not imply a fast finish')
  assert.equal(endingQuote(performance(10), 'nl'), perfect, 'Cormac keeps his English voice')
})

test('game-over lines reflect mistakes, progress and the reason for stopping in both languages', () => {
  const scenarios = [
    performance(0, 6, 1, 0, 'mistakes'),
    performance(4, 6, 1, 400, 'mistakes'),
    performance(8, 2, 5, 1600, 'mistakes'),
    { ...performance(8, 0, 1, 800, 'game-time'), results: [...results(8), 'timeout' as const] },
    { ...performance(0, 0, 1, 0, 'question-time'), results: ['timeout' as const] },
    performance(2, 0, 1, 200, 'question-time'),
    performance(2, 0, 1, 200, 'game-time'),
    performance(2, 0, 1, 200, 'image')
  ]
  for (const language of ['nl', 'en'] as const) {
    const quotes = scenarios.map(scenario => endingQuote(scenario, language))
    assert.equal(new Set(quotes).size, scenarios.length)
    assert.ok(quotes.every(quote => quote.length > 0 && quote.length <= 65), 'lines fit the ending panel')
    assert.equal(endingQuote(scenarios[7], language), endingQuote(performance(0, 0, 1, 0, 'image'), language), 'image failures never pretend the player made mistakes')
  }
  assert.notEqual(endingQuote(scenarios[0], 'nl'), endingQuote(scenarios[0], 'en'))
})
