import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createActor } from 'xstate'
import { createInactivityTimer, IDLE_MILLISECONDS } from '../src/lib/game/inactivity.ts'
import { gameMachine } from '../src/lib/game/machine.ts'

test('inactivity waits a full minute after the latest input, expires once, and can be stopped', context => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  let sleeps = 0
  const timer = createInactivityTimer(() => sleeps++)
  context.mock.timers.tick(IDLE_MILLISECONDS - 1)
  assert.equal(sleeps, 0)
  timer.reset()
  context.mock.timers.tick(IDLE_MILLISECONDS - 1)
  assert.equal(sleeps, 0, 'input must restart the entire idle interval')
  context.mock.timers.tick(1)
  assert.equal(sleeps, 1)
  context.mock.timers.tick(IDLE_MILLISECONDS * 2)
  assert.equal(sleeps, 1, 'the sleeping screen does not repeatedly reset')
  timer.reset()
  timer.stop()
  context.mock.timers.tick(IDLE_MILLISECONDS)
  assert.equal(sleeps, 1, 'unmount cancels the timer')
})

test('waking the screensaver returns to the title without starting or skipping avatar selection', () => {
  const actor = createActor(gameMachine).start()
  actor.send({ type: 'SELECT_TEAM' })
  actor.send({ type: 'CHOOSE_CHARACTER', characterId: 'jill' })
  actor.send({ type: 'IDLE' })
  assert.equal(actor.getSnapshot().value, 'idle')
  actor.send({ type: 'CONFIRM' })
  actor.send({ type: 'SELECT_TEAM' })
  assert.equal(actor.getSnapshot().value, 'idle')
  actor.send({ type: 'WAKE' })
  assert.equal(actor.getSnapshot().value, 'title')
  assert.equal(actor.getSnapshot().context.characterId, 'jill')
  assert.deepEqual(actor.getSnapshot().context.questions, [])
  actor.send({ type: 'SELECT_TEAM' })
  assert.equal(actor.getSnapshot().value, 'choosing')
  actor.stop()
})

test('a 15-second warning precedes idle and continuing cancels both pending callbacks', context => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  let warnings = 0, sleeps = 0
  const timer = createInactivityTimer(() => sleeps++, IDLE_MILLISECONDS, () => warnings++)
  context.mock.timers.tick(44_999)
  assert.equal(warnings, 0)
  context.mock.timers.tick(1)
  assert.equal(warnings, 1)
  assert.equal(sleeps, 0)
  context.mock.timers.tick(10_000)
  timer.reset()
  context.mock.timers.tick(5000)
  assert.equal(sleeps, 0, 'continuing cancels the original expiry')
  context.mock.timers.tick(40_000)
  assert.equal(warnings, 2)
  context.mock.timers.tick(15_000)
  assert.equal(sleeps, 1)
  timer.reset()
  timer.stop()
  context.mock.timers.tick(IDLE_MILLISECONDS)
  assert.equal(warnings, 2)
  assert.equal(sleeps, 1)
})
