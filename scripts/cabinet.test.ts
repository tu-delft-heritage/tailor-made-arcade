import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createActor } from 'xstate'
import { cabinetKeys, descriptionPages, joystickDirection, moveSelection, moveTeammate } from '../src/lib/game/cabinet.ts'
import { gameMachine } from '../src/lib/game/machine.ts'
import { createQuestionBank, createSession } from '../src/lib/game/questions/index.ts'
import type { GameData } from '../src/lib/game/types.ts'

const data: GameData = JSON.parse(await readFile(new URL('../src/lib/data/game-data.json', import.meta.url), 'utf8'))

test('cabinet keys match the reference cabinet and joystick movement follows the 2×2 layout', () => {
  assert.deepEqual(cabinetKeys, { toggle: 'KeyZ', zoomOut: 'KeyX', zoomIn: 'KeyC', submit: 'KeyV' })
  assert.equal(joystickDirection('ArrowDown'), 'down')
  assert.equal(joystickDirection('KeyV'), undefined)
  for (const [direction, expected] of Object.entries({ up: [0, 1, 0, 1], down: [2, 3, 2, 3], left: [0, 0, 2, 2], right: [1, 1, 3, 3] })) {
    assert.deepEqual([0, 1, 2, 3].map(index => moveSelection(index, direction as 'up' | 'down' | 'left' | 'right')), expected)
  }
})

test('teammate navigation follows desktop and mobile rows without entering empty slots', () => {
  assert.equal(moveTeammate(2, 'down', 5, 10), 7, 'Anna to Elin on desktop')
  assert.equal(moveTeammate(7, 'right', 5, 10), 8, 'Elin to Karin')
  assert.equal(moveTeammate(8, 'right', 5, 10), 9, 'Karin to Jill')
  assert.equal(moveTeammate(9, 'right', 5, 10), 9, 'right edge does not wrap')
  assert.equal(moveTeammate(9, 'up', 5, 10), 4, 'Jill to Isabel on desktop')
  assert.equal(moveTeammate(4, 'down', 4, 10), 8, 'Isabel to Karin on mobile')
  assert.equal(moveTeammate(5, 'down', 4, 10), 9, 'Cormac to Jill on mobile')
  assert.equal(moveTeammate(7, 'down', 4, 10), 7, 'empty mobile slot is unreachable')
  assert.equal(moveTeammate(8, 'left', 4, 10), 8, 'mobile row boundary')
  for (const columns of [4, 5]) {
    for (let index = 0; index < 10; index++) {
      for (const direction of ['up', 'down', 'left', 'right'] as const) {
        const next = moveTeammate(index, direction, columns, 10)
        assert.ok(next >= 0 && next < 10)
      }
    }
  }
})

test('joystick confirmation requires a ready image, submits the highlighted answer, and locks the result', () => {
  const actor = createActor(gameMachine).start()
  const questions = createSession(createQuestionBank(data, 'nl'), 42)
  const question = questions[0]
  actor.send({ type: 'SELECT_TEAM' })
  actor.send({ type: 'START', questions })
  actor.send({ type: 'INTRO_DONE' })
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
  actor.send({ type: 'SELECT_TEAM' })
  actor.send({ type: 'START', questions })
  actor.send({ type: 'INTRO_DONE' })
  assert.equal(actor.getSnapshot().context.activeChoice, 0)
  assert.equal(actor.getSnapshot().context.selected, null)
  actor.stop()
})

test('description pages retain all collection text while fitting the cabinet text budget', () => {
  for (const object of data.objects) {
    for (const description of Object.values(object.description)) {
      if (!description) continue
      const pages = descriptionPages(description)
      assert.equal(pages.join(' ').replace(/\s+/g, ' '), description.trim().replace(/\s+/g, ' '))
      assert.ok(pages.every(page => page.length <= 210 || !page.includes(' ')))
    }
  }
  assert.deepEqual(descriptionPages(''), [''])
  assert.deepEqual(descriptionPages('Collection record 2000.0012\nMaker: A. B. Example.'), ['Collection record 2000.0012\nMaker: A. B. Example.'])
})
