import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createVictoryDeck, victoryScenes, type VictoryScene } from '../src/lib/game/victory-scenes.ts'

test('every victory appears once per deck, with no consecutive repeat when it refills', () => {
  let previous: VictoryScene | undefined
  for (let seed = 0; seed < 100; seed++) {
    const deck = createVictoryDeck(seed, previous)
    assert.deepEqual([...deck].sort(), [...victoryScenes].sort())
    assert.notEqual(deck[0], previous)
    previous = deck.at(-1)
  }
})

test('different seeds vary the order and every previous scene is excluded from the next draw', () => {
  const orders = new Set<string>()
  for (let seed = 0; seed < 100; seed++) {
    orders.add(createVictoryDeck(seed).join(','))
    for (const previous of victoryScenes) assert.notEqual(createVictoryDeck(seed, previous)[0], previous)
  }
  assert.ok(orders.size > 4)
})
