import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createActor } from 'xstate'
import { cabinetKeys, descriptionPages, joystickDirection, moveSelection } from '../src/lib/game/cabinet.ts'
import { gameMachine } from '../src/lib/game/machine.ts'
import { createIdentificationSession } from '../src/lib/game/questions/identify-object.ts'
import type { GameObject } from '../src/lib/game/types.ts'

const { objects }: { objects: GameObject[] } = JSON.parse(await readFile(new URL('../src/lib/data/game-data.json', import.meta.url), 'utf8'))

test('cabinet keys match the reference cabinet and joystick movement follows the 2×2 layout', () => {
  assert.deepEqual(cabinetKeys, { toggle: 'KeyZ', zoomOut: 'KeyX', zoomIn: 'KeyC', submit: 'KeyV' })
  assert.equal(joystickDirection('ArrowDown'), 'down')
  assert.equal(joystickDirection('KeyV'), undefined)
  for (const [direction, expected] of Object.entries({ up: [0, 1, 0, 1], down: [2, 3, 2, 3], left: [0, 0, 2, 2], right: [1, 1, 3, 3] })) {
    assert.deepEqual([0, 1, 2, 3].map(index => moveSelection(index, direction as 'up' | 'down' | 'left' | 'right')), expected)
  }
})

test('joystick confirmation requires a ready image, submits the highlighted answer, and locks the result', () => {
  const actor = createActor(gameMachine).start()
  const questions = createIdentificationSession(objects, 42, 'nl')
  const question = questions[0]
  actor.send({ type: 'START', questions })
  actor.send({ type: 'MOVE', direction: 'down' })
  actor.send({ type: 'CONFIRM' })
  assert.equal(actor.getSnapshot().value, 'loading')
  assert.equal(actor.getSnapshot().context.activeChoice, 0)
  actor.send({ type: 'IMAGE_READY' })
  actor.send({ type: 'MOVE', direction: 'right' })
  actor.send({ type: 'MOVE', direction: 'down' })
  actor.send({ type: 'CONFIRM' })
  assert.equal(actor.getSnapshot().value, 'reveal')
  assert.equal(actor.getSnapshot().context.selected, question.choices[3])
  assert.equal(actor.getSnapshot().context.score, question.choices[3] === question.answer ? 100 : 0)
  actor.send({ type: 'MOVE', direction: 'left' })
  actor.send({ type: 'CONFIRM' })
  assert.equal(actor.getSnapshot().context.activeChoice, 3)
  assert.equal(actor.getSnapshot().context.selected, question.choices[3])
  actor.send({ type: 'FINISH' })
  actor.send({ type: 'HOME' })
  actor.send({ type: 'START', questions })
  assert.equal(actor.getSnapshot().context.activeChoice, 0)
  assert.equal(actor.getSnapshot().context.selected, null)
  actor.stop()
})

test('description pages retain all collection text while fitting the cabinet text budget', () => {
  for (const object of objects) {
    for (const description of Object.values(object.description)) {
      if (!description) continue
      const pages = descriptionPages(description)
      assert.equal(pages.join(' '), description.trim().replace(/\s+/g, ' '))
      assert.ok(pages.every(page => page.length <= 210 || !page.includes(' ')))
    }
  }
  assert.deepEqual(descriptionPages(''), [''])
})
