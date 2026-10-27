import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SCOREBOARD_KEY, isNewHighScore, parseScoreboard, readScoreboard, recordHighScore, type ScoreStorage } from '../src/lib/game/scoreboard.ts'

test('scoreboard recovers missing or damaged storage and rejects invalid scores', () => {
  for (const raw of [null, 'not json', 'null', '[]', '42']) {
    const scores = parseScoreboard(raw)
    assert.equal(Object.keys(scores).length, 10)
    assert.ok(Object.values(scores).every(value => value === 0))
  }
  const scores = parseScoreboard('{"elin":700,"karin":-1,"jill":"500","daphne":9007199254740992,"anna":0.5,"unknown":900}')
  assert.equal(scores.elin, 700)
  assert.ok(Object.entries(scores).filter(([name]) => name !== 'elin').every(([, score]) => score === 0))
  assert.equal('unknown' in scores, false)
})

test('avatar records survive reloads, never decrease and merge another tab’s records', () => {
  const values = new Map<string, string>()
  const storage: ScoreStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value) } }
  const initial = readScoreboard(storage)
  let scores = recordHighScore(initial, 'elin', 600, storage)
  assert.equal(readScoreboard(storage).elin, 600)
  scores = recordHighScore(scores, 'elin', 200, storage)
  assert.equal(scores.elin, 600)
  recordHighScore(initial, 'karin', 800, storage)
  scores = recordHighScore(scores, 'jill', 300, storage)
  assert.equal(scores.karin, 800)
  assert.equal(scores.elin, 600)
  assert.equal(scores.jill, 300)
  assert.deepEqual(JSON.parse(values.get(SCOREBOARD_KEY)!), scores)
  assert.equal(recordHighScore(scores, 'jill', Infinity, storage).jill, 300)
})

test('blocked localStorage still keeps a usable scoreboard for the current visit', () => {
  const blocked: ScoreStorage = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
  const scores = recordHighScore(readScoreboard(blocked), 'cormac', 1000, blocked)
  assert.equal(scores.cormac, 1000)
  assert.equal(recordHighScore(scores, 'cormac', 100, blocked).cormac, 1000)
})

test('a new record requires a valid score strictly higher than the avatar’s previous best', () => {
  assert.equal(isNewHighScore(0, 0), false)
  assert.equal(isNewHighScore(100, 0), true)
  assert.equal(isNewHighScore(400, 400), false)
  assert.equal(isNewHighScore(300, 400), false)
  assert.equal(isNewHighScore(500, 400), true)
  assert.equal(isNewHighScore(1000, 900), true)
  assert.equal(isNewHighScore(2450, 1900), true)
  assert.equal(parseScoreboard('{"daphne":2450}').daphne, 2450)
  assert.equal(isNewHighScore(Number.MAX_SAFE_INTEGER + 1, 900), false)
})
