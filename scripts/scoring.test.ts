import assert from 'node:assert/strict'
import { test } from 'node:test'
import { answerPoints, roundRules } from '../src/lib/game/scoring.ts'

test('correct answers earn a proportional speed bonus; wrong answers never score', () => {
  assert.equal(answerPoints(true, 20_000, 20, 1), 200)
  assert.equal(answerPoints(true, 10_000, 20, 1), 150)
  assert.equal(answerPoints(true, 0, 20, 1), 100)
  assert.equal(answerPoints(true, 15_000, 30, 1), 150, 'long questions use the same proportional bonus')
  assert.equal(answerPoints(false, 20_000, 20, 1), 0)
  assert.equal(answerPoints(true, -500, 20, 1), 100)
  assert.equal(answerPoints(true, 50_000, 20, 1), 200)
  assert.equal(answerPoints(true, NaN, 20, 1), 100)
})

test('repeat rounds shorten both limits, raise rewards and keep a playable time floor', () => {
  assert.deepEqual(roundRules(1), { timeFactor: 1, totalSeconds: 240, multiplier: 1 })
  assert.deepEqual(roundRules(2), { timeFactor: 0.85, totalSeconds: 204, multiplier: 1.25 })
  assert.equal(answerPoints(true, 17_000, 17, 2), 250)
  assert.ok(roundRules(3).totalSeconds < roundRules(2).totalSeconds)
  assert.ok(answerPoints(true, 0, 14, 3) > answerPoints(true, 0, 17, 2))
  assert.equal(roundRules(100).totalSeconds, 96)
  assert.equal(roundRules(100).timeFactor * 20, 8)
})
