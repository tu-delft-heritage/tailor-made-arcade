import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SCOREBOARD_KEY, type ScoreStorage } from '../src/lib/game/scoreboard.ts'
import { LANGUAGE_KEY, bestScoreKey, migrateStoredPreferences } from '../src/lib/game/storage.ts'

function memoryStorage(entries: Record<string, string>) {
  const values = new Map(Object.entries(entries))
  const writes: string[] = []
  const storage: ScoreStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); writes.push(key) }
  }
  return { storage, values, writes }
}

test('renaming storage preserves language and both old best scores without changing avatar records', () => {
  const records = '{"daphne":1200,"elin":1600}'
  const { storage, values, writes } = memoryStorage({
    'daphnes-arcade:language:v1': 'en',
    'daphnes-arcade:best:v3:nl': '1900',
    'daphnes-arcade:best:v3:en': '2200',
    [SCOREBOARD_KEY]: records
  })
  migrateStoredPreferences(storage)
  assert.equal(values.get(LANGUAGE_KEY), 'en')
  assert.equal(values.get(bestScoreKey('nl')), '1900')
  assert.equal(values.get(bestScoreKey('en')), '2200')
  assert.equal(values.get(SCOREBOARD_KEY), records)
  assert.equal(values.get('daphnes-arcade:best:v3:nl'), '1900', 'migration is non-destructive')
  assert.equal(writes.length, 3)
  migrateStoredPreferences(storage)
  assert.equal(writes.length, 3, 'reloading does not rewrite already migrated values')
})

test('migration keeps the current language and the highest score in either namespace', () => {
  const { storage, values } = memoryStorage({
    [LANGUAGE_KEY]: 'nl', 'daphnes-arcade:language:v1': 'en',
    [bestScoreKey('nl')]: '2400', 'daphnes-arcade:best:v3:nl': '1900',
    [bestScoreKey('en')]: '1500', 'daphnes-arcade:best:v3:en': '1800'
  })
  migrateStoredPreferences(storage)
  assert.equal(values.get(LANGUAGE_KEY), 'nl')
  assert.equal(values.get(bestScoreKey('nl')), '2400')
  assert.equal(values.get(bestScoreKey('en')), '1800')
})

test('invalid historical scores and preferences are not imported', () => {
  for (const invalid of ['', ' ', '-1', '1.5', 'Infinity', 'NaN', 'oops', '9007199254740992']) {
    const { storage, writes } = memoryStorage({
      'daphnes-arcade:language:v1': 'unknown',
      'daphnes-arcade:best:v3:nl': invalid
    })
    migrateStoredPreferences(storage)
    assert.deepEqual(writes, [])
  }
  const { storage, values } = memoryStorage({
    [LANGUAGE_KEY]: 'invalid', 'daphnes-arcade:language:v1': 'nl',
    [bestScoreKey('nl')]: 'broken', 'daphnes-arcade:best:v3:nl': '0'
  })
  migrateStoredPreferences(storage)
  assert.equal(values.get(LANGUAGE_KEY), 'nl')
  assert.equal(values.get(bestScoreKey('nl')), '0')
})

test('unavailable or unwritable storage never prevents startup', () => {
  assert.doesNotThrow(() => migrateStoredPreferences())
  assert.doesNotThrow(() => migrateStoredPreferences({
    getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') }
  }))
  const { storage, values } = memoryStorage({
    'daphnes-arcade:language:v1': 'en', 'daphnes-arcade:best:v3:nl': '1000'
  })
  assert.doesNotThrow(() => migrateStoredPreferences({
    ...storage, setItem() { throw new Error('full') }
  }))
  assert.equal(values.get('daphnes-arcade:best:v3:nl'), '1000')
})
