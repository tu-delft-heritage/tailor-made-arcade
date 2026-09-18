import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createActor } from 'xstate'
import { gameMachine } from '../src/lib/game/machine.ts'
import { createIdentificationSession, supportsLanguage } from '../src/lib/game/questions/identify-object.ts'
import type { GameObject, Language } from '../src/lib/game/types.ts'

const { objects }: { objects: GameObject[] } = JSON.parse(await readFile(new URL('../src/lib/data/game-data.json', import.meta.url), 'utf8'))

for (const language of ['nl', 'en'] as Language[]) {
  test(`${language} sessions contain eight unique, translated questions with valid choices`, () => {
    const positions = new Set<number>()
    for (let seed = 1; seed <= 40; seed++) {
      const questions = createIdentificationSession(objects, seed * 1234567, language)
      assert.equal(questions.length, 8)
      assert.equal(new Set(questions.map(question => question.object.id)).size, 8)
      for (const [index, question] of questions.entries()) {
        assert.equal(supportsLanguage(question.object, language), true)
        assert.equal(question.choices.length, 4)
        assert.equal(new Set(question.choices).size, 4)
        assert.equal(question.choices.filter(choice => choice === question.answer).length, 1)
        if (index) assert.notEqual(question.answer, questions[index - 1].answer)
        positions.add(question.choices.indexOf(question.answer))
      }
      assert.deepEqual(questions, createIdentificationSession(objects, seed * 1234567, language))
    }
    assert.equal(positions.size, 4)
  })
}

test('a session scores each answer once, advances eight rounds, and records progress', () => {
  const questions = createIdentificationSession(objects, 42, 'nl')
  const actor = createActor(gameMachine).start()
  actor.send({ type: 'START', questions })
  for (let index = 0; index < questions.length; index++) {
    actor.send({ type: 'CONFIRM' })
    assert.equal(actor.getSnapshot().value, 'loading')
    actor.send({ type: 'IMAGE_READY' })
    actor.send({ type: 'ANSWER', answer: questions[index].answer })
    assert.equal(actor.getSnapshot().value, 'reveal')
    actor.send({ type: 'ANSWER', answer: questions[index].answer })
    assert.equal(actor.getSnapshot().context.score, (index + 1) * 100)
    actor.send({ type: 'FINISH' })
  }
  const snapshot = actor.getSnapshot()
  assert.equal(snapshot.value, 'results')
  assert.equal(snapshot.context.score, 800)
  assert.deepEqual(snapshot.context.results, Array(8).fill('correct'))
  actor.stop()
})

test('question and overall timeouts end the game and lock further scoring', () => {
  const questions = createIdentificationSession(objects, 7, 'en')
  const actor = createActor(gameMachine).start()
  actor.send({ type: 'START', questions })
  actor.send({ type: 'IMAGE_READY' })
  actor.send({ type: 'TIMEOUT', reason: 'question-time' })
  assert.equal(actor.getSnapshot().value, 'gameOver')
  assert.equal(actor.getSnapshot().context.gameOverReason, 'question-time')
  assert.deepEqual(actor.getSnapshot().context.results, ['timeout'])
  actor.send({ type: 'ANSWER', answer: questions[0].answer })
  assert.equal(actor.getSnapshot().context.score, 0)
  actor.send({ type: 'START', questions })
  actor.send({ type: 'TIMEOUT', reason: 'game-time' })
  assert.equal(actor.getSnapshot().context.gameOverReason, 'game-time')
  actor.stop()
})
