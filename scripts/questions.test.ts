import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createActor } from 'xstate'
import { createQuestionBank, createSession, questionKinds, questionObjects, replacementQuestion } from '../src/lib/game/questions/index.ts'
import { dateRange, rangesOverlap, confusable } from '../src/lib/game/questions/metadata.ts'
import { definitionClue, mentionsEntity } from '../src/lib/game/questions/definition.ts'
import { gameMachine } from '../src/lib/game/machine.ts'
import type { FactField, GameData, Language } from '../src/lib/game/types.ts'
const data: GameData = JSON.parse(await readFile(new URL('../src/lib/data/game-data.json', import.meta.url), 'utf8'))
const banks = { nl: createQuestionBank(data, 'nl'), en: createQuestionBank(data, 'en') }

test('all 720 records can appear in both languages; every supported field has questions', () => {
  assert.equal(data.objects.length, 720)
  for (const language of ['nl', 'en'] as Language[]) {
    assert.equal(new Set(banks[language].map(q => q.object.id)).size, 720)
    for (const kind of questionKinds.filter(k => language === 'nl' || k !== 'related')) assert.ok(banks[language].some(q => q.kind === kind), kind)
    assert.ok(banks[language].length > 5000)
  }
})
for (const language of ['nl', 'en'] as Language[]) {
  test(`${language}: every generated question has one answer, explicit prompt and source evidence`, () => {
    for (const q of banks[language]) {
      assert.equal(q.choices.length, 4, q.id)
      assert.equal(new Set(q.choices).size, 4, q.id)
      assert.equal(q.choices.filter(c => c === q.answer).length, 1, q.id)
      assert.ok(q.prompt.endsWith('?'), q.id)
      assert.ok(q.explanation.length && q.evidence.length, q.id)
      assert.ok(q.evidence.every(e => e.source.startsWith('http') && e.values.length), q.id)
      if (q.kind === 'definition-detective') {
        assert.equal(q.clue, definitionClue(data.entities[q.object.facts.type![0]], language))
      } else if (q.kind === 'odd-one-out') {
        const [start, end] = q.prompt.match(/\d{4}/g)!.map(Number)
        const outside = q.photos!.filter(o => { const range = dateRange(o.date!)!; return range[1] < start || range[0] > end })
        assert.deepEqual(outside.map(o => o.id), [q.object.id])
        assert.equal(q.photos!['ABCD'.indexOf(q.answer)].id, q.object.id)
        assert.equal(new Set(q.photos!.map(o => o.imageRemote)).size, 4)
      } else {
        const field: FactField = q.kind === 'identify-object' ? 'type' : q.kind
        const correct = q.object.facts[field]!.map(id => data.entities[id])
        assert.ok(correct.some(e => e.labels[language] === q.answer), q.id)
        for (const other of q.choices.filter(c => c !== q.answer)) {
          assert.ok(!correct.some(e => e.labels[language] === other), `Second correct fact: ${q.id}`)
          if (field === 'date') assert.equal(rangesOverlap(q.answer, other), false)
        }
        if (q.kind === 'professor') {
          const person = correct.find(e => e.labels[language] === q.answer)!
          assert.ok(person.professorEvidence)
          assert.ok(['maker', 'designer', 'manufacturer'].some(field => q.object.facts[field as FactField]?.includes(person.id)))
        }
      }
    }
  })
  test(`${language}: 100 seeded missions balance ten types without repeated records or photographs`, () => {
    const positions = new Set<number>()
    for (let seed = 1; seed <= 100; seed++) {
      const questions = createSession(banks[language], seed * 124741)
      assert.equal(questions.length, 10)
      assert.equal(new Set(questions.map(q => q.kind)).size, 10)
      for (const kind of ['depicted', 'place', 'professor', 'definition-detective', 'odd-one-out']) assert.ok(questions.some(q => q.kind === kind))
      const objects = questions.flatMap(questionObjects)
      assert.equal(new Set(objects.map(o => o.id)).size, objects.length)
      assert.equal(new Set(objects.map(o => o.imageRemote)).size, objects.length)
      assert.deepEqual(questions, createSession(banks[language], seed * 124741))
      questions.forEach(q => positions.add(q.choices.indexOf(q.answer)))
    }
    assert.equal(positions.size, 4)
  })
}

test('missing fields and untranslated vocabulary cannot manufacture facts', () => {
  const blank = { ...data.objects[0], facts: {}, date: null }
  assert.equal(createQuestionBank({ ...data, objects: [blank] }, 'en').length, 0)
  const nlOnly = Object.values(data.entities).find(e => e.id.startsWith('type:') && !e.labels.en)!
  assert.equal(definitionClue(nlOnly, 'en'), undefined)
  const mirror = Object.values(data.entities).find(e => e.labels.nl === 'hoekspiegel')!
  assert.equal(mentionsEntity('Een hoekspiegl of prisma wordt door landmeters gebruikt.', mirror), true)
  assert.equal(definitionClue(mirror, 'nl'), undefined, 'source spelling errors cannot disclose the answer')
  assert.equal(rangesOverlap('1875–1925', '1900'), true)
  assert.equal(rangesOverlap('1900', '1901–1925'), false)
  assert.equal(confusable({ id: 'a', labels: {}, aliases: ['waterpas'] }, { id: 'b', labels: {}, aliases: ['waterpasinstrument'] }), true)
})

test('failed photographs are replaced without scoring, advancing or reusing an object', () => {
  const questions = createSession(banks.nl, 313)
  const failed = new Set(questionObjects(questions[0]).map(o => o.id))
  const replacement = replacementQuestion(banks.nl, questions, failed, questions[0].kind)!
  assert.ok(replacement)
  const actor = createActor(gameMachine).start()
  actor.send({ type: 'SELECT_TEAM' }); actor.send({ type: 'START', questions }); actor.send({ type: 'INTRO_DONE' })
  actor.send({ type: 'REPLACE_QUESTION', question: replacement })
  assert.equal(actor.getSnapshot().value, 'loading')
  assert.equal(actor.getSnapshot().context.score, 0)
  assert.equal(actor.getSnapshot().context.questionIndex, 0)
  assert.deepEqual(actor.getSnapshot().context.results, [])
  assert.ok(questionObjects(replacement).every(o => !failed.has(o.id)))
  actor.send({ type: 'IMAGE_READY' })
  actor.send({ type: 'REPLACE_QUESTION', question: questions[0] })
  assert.equal(actor.getSnapshot().context.questions[0].id, replacement.id, 'playing questions are locked')
  for (const question of actor.getSnapshot().context.questions) {
    actor.send({ type: 'IMAGE_READY' }); actor.send({ type: 'ANSWER', answer: question.answer }); actor.send({ type: 'FINISH' })
  }
  assert.equal(actor.getSnapshot().value, 'results')
  assert.equal(actor.getSnapshot().context.score, 1000)
  actor.stop()
})
