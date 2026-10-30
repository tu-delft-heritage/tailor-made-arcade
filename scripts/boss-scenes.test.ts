import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bossScenes, createBossDeck, type BossScene } from '../src/lib/game/boss-scenes.ts'

test('all five boss artworks appear once per deck without repeats at the boundary', () => {
  let previous: BossScene | undefined
  for (let seed = 0; seed < 100; seed++) {
    const deck = createBossDeck(seed, previous)
    assert.deepEqual([...deck].sort(), [...bossScenes].sort())
    assert.notEqual(deck[0], previous)
    previous = deck.at(-1)
  }
})

test('boss order varies with the seed and never opens with the previous artwork', () => {
  const orders = new Set<string>()
  for (let seed = 0; seed < 100; seed++) {
    orders.add(createBossDeck(seed).join(','))
    for (const previous of bossScenes) assert.notEqual(createBossDeck(seed, previous)[0], previous)
  }
  assert.ok(orders.size > 5)
})
