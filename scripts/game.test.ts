import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createActor } from 'xstate'
import { gameMachine } from '../src/lib/game/machine.ts'
import { createQuestionBank, createSession } from '../src/lib/game/questions/index.ts'
import { characterIds, type CharacterId, type GameData, type Language } from '../src/lib/game/types.ts'

const data: GameData = JSON.parse(await readFile(new URL('../src/lib/data/game-data.json', import.meta.url), 'utf8'))
const banks = { nl: createQuestionBank(data, 'nl'), en: createQuestionBank(data, 'en') }
const questionsFor = (seed: number, language: Language) => createSession(banks[language], seed)

test('a session scores each answer once, advances ten rounds, and records progress', () => {
  const questions = questionsFor(42, 'nl')
  const actor = createActor(gameMachine).start()
  actor.send({ type: 'SELECT_TEAM' })
  actor.send({ type: 'START', questions })
  actor.send({ type: 'INTRO_DONE' })
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
  assert.equal(snapshot.context.score, 1000)
  assert.deepEqual(snapshot.context.results, Array(10).fill('correct'))
  actor.stop()
})

test('question and overall timeouts end the game and lock further scoring', () => {
  const questions = questionsFor(7, 'en')
  const actor = createActor(gameMachine).start()
  actor.send({ type: 'SELECT_TEAM' })
  actor.send({ type: 'START', questions })
  actor.send({ type: 'INTRO_DONE' })
  actor.send({ type: 'IMAGE_READY' })
  actor.send({ type: 'TIMEOUT', reason: 'question-time' })
  assert.equal(actor.getSnapshot().value, 'gameOver')
  assert.equal(actor.getSnapshot().context.gameOverReason, 'question-time')
  assert.deepEqual(actor.getSnapshot().context.results, ['timeout'])
  actor.send({ type: 'ANSWER', answer: questions[0].answer })
  assert.equal(actor.getSnapshot().context.score, 0)
  actor.send({ type: 'SELECT_TEAM' })
  actor.send({ type: 'START', questions })
  actor.send({ type: 'INTRO_DONE' })
  actor.send({ type: 'TIMEOUT', reason: 'game-time' })
  assert.equal(actor.getSnapshot().context.gameOverReason, 'game-time')
  actor.stop()
})


test('all seven teammates can be selected; the opening cannot score or time out', () => {
  const questions = questionsFor(42, 'en')
  for (const characterId of characterIds) {
    const actor = createActor(gameMachine).start()
    actor.send({ type: 'START', questions })
    assert.equal(actor.getSnapshot().value, 'title', 'selection cannot be bypassed')
    actor.send({ type: 'SELECT_TEAM' })
    actor.send({ type: 'CHOOSE_CHARACTER', characterId })
    actor.send({ type: 'CHOOSE_CHARACTER', characterId: 'unknown' as CharacterId })
    assert.equal(actor.getSnapshot().context.characterId, characterId)
    actor.send({ type: 'START', questions })
    assert.equal(actor.getSnapshot().value, 'intro')
    actor.send({ type: 'START', questions })
    actor.send({ type: 'ANSWER', answer: questions[0].answer })
    actor.send({ type: 'TIMEOUT', reason: 'game-time' })
    actor.send({ type: 'IMAGE_READY' })
    assert.equal(actor.getSnapshot().value, 'intro')
    assert.equal(actor.getSnapshot().context.score, 0)
    actor.send({ type: 'INTRO_DONE' })
    actor.send({ type: 'CHOOSE_CHARACTER', characterId: 'anna' })
    actor.send({ type: 'IMAGE_READY' })
    assert.equal(actor.getSnapshot().value, 'playing')
    assert.equal(actor.getSnapshot().context.characterId, characterId, 'identity is locked during play')
    actor.send({ type: 'TIMEOUT', reason: 'question-time' })
    actor.send({ type: 'SELECT_TEAM' })
    assert.equal(actor.getSnapshot().value, 'choosing')
    actor.send({ type: 'CHOOSE_CHARACTER', characterId: 'catherine' })
    actor.send({ type: 'START', questions })
    assert.equal(actor.getSnapshot().value, 'intro')
    assert.equal(actor.getSnapshot().context.characterId, 'catherine')
    assert.deepEqual(actor.getSnapshot().context.results, [])
    actor.stop()
  }
})
