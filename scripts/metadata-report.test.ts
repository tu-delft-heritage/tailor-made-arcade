import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { metadataReportMailto } from '../src/lib/game/metadata-report.ts'
import { createQuestionBank } from '../src/lib/game/questions/index.ts'
import type { GameData, Language, Question } from '../src/lib/game/types.ts'

const data: GameData = JSON.parse(await readFile(new URL('../src/lib/data/game-data.json', import.meta.url), 'utf8'))
const banks = { nl: createQuestionBank(data, 'nl'), en: createQuestionBank(data, 'en') }
const permalink = (id: string) => `https://heritage.tudelft.nl/objects/${id}`
function draft(question: Question, selected: string | null = question.choices[0]) {
  const url = new URL(metadataReportMailto(question, selected, data.objects))
  assert.equal(url.protocol, 'mailto:')
  assert.equal(url.pathname, 'library@tudelft.nl')
  assert.deepEqual([...url.searchParams.keys()], ['subject', 'body'])
  return { subject: url.searchParams.get('subject')!, body: url.searchParams.get('body')! }
}

test('Dutch and English drafts preserve the question, clue, answers and special characters', () => {
  for (const language of ['nl', 'en'] as Language[]) {
    const question = banks[language].find(question => question.kind === 'definition-detective')!
    const selected = 'één & twee + #3?'
    const { subject, body } = draft(question, selected)
    assert.match(subject, language === 'nl' ? /mogelijke fout/ : /possible collection metadata error/)
    assert.ok(body.startsWith(language === 'nl' ? 'Beste conservator,' : 'Dear curator,'))
    for (const value of [question.prompt, question.clue!, question.answer, selected, ...question.choices]) assert.ok(body.includes(value), value)
    assert.ok(body.includes(question.explanation.replace(/\n/g, '\r\n')))
    assert.equal(body.split(permalink(question.object.id)).length - 1, 1)
    assert.ok(!/(?<!\r)\n/.test(body), 'Email line breaks use CRLF')
  }
})

test('linked-object reports include both the pictured object and the answer record', () => {
  const question = banks.nl.find(question => question.kind === 'related')!
  const { body } = draft(question)
  for (const id of [question.object.id, question.answerObjectId!]) {
    const object = data.objects.find(object => object.id === id)!
    assert.ok(body.includes(`${object.title} (${object.identifier})`))
    assert.equal(body.split(permalink(id)).length - 1, 1)
  }
})

test('four-photo reports keep all specimen letters and link each object exactly once', () => {
  const question = banks.en.find(question => question.kind === 'odd-one-out')!
  const { body } = draft(question, 'B')
  question.photos!.forEach((object, index) => {
    assert.ok(body.includes(`${'ABCD'[index]}: ${object.title} (${object.identifier})`))
    assert.equal(body.split(permalink(object.id)).length - 1, 1)
  })
  assert.match(body, /My selected answer: B/)
})

test('professor reports include separate evidence records without duplicate links', () => {
  const question = banks.nl.find(question => question.kind === 'professor' && question.evidence.some(item => item.objectId !== question.object.id))!
  assert.ok(question, 'Use a question supported by a separate collection record')
  const { body } = draft(question, null)
  for (const id of new Set(question.evidence.map(item => item.objectId))) assert.equal(body.split(permalink(id)).length - 1, 1)
  assert.ok(!body.includes('Mijn gekozen antwoord:'))
})
