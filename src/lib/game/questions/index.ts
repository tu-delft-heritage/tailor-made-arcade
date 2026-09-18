import { factFields, type GameData, type Language, type Question, type QuestionKind } from '../types.ts'
import { metadataQuestions, type QuestionBank } from './metadata.ts'
import { definitionQuestions } from './definition.ts'
import { oddOneOutQuestions } from './odd-one-out.ts'
import { randomSource, shuffle } from './random.ts'
export const questionKinds: QuestionKind[] = ['identify-object', ...factFields.filter(f => f !== 'type'), 'definition-detective', 'odd-one-out']
export function createQuestionBank(data: GameData, language: Language): QuestionBank {
  const bank = metadataQuestions(data, language)
  const definitions = definitionQuestions(data, language)
  bank.exclusions['definition: missing translation, short safe clue, or distinct distractors'] = data.objects.length - definitions.length
  const odd = oddOneOutQuestions(data, language)
  bank.exclusions['odd-one-out: missing/non-isolatable dates or photos'] = data.objects.length - odd.length
  bank.push(...definitions, ...odd)
  return bank
}
export const questionObjects = (question: Question) => question.photos ?? [question.object]
export function createSession(bank: Question[], seed: number, count = 10): Question[] {
  const random = randomSource(seed)
  const available = shuffle(bank, random)
  const kinds = new Set(bank.map(q => q.kind))
  const dimensions = shuffle(['height', 'width', 'depth'] as QuestionKind[], random)
  // Start each mission with broad coverage; rotate the additional catalogue fields.
  const preferred: QuestionKind[] = shuffle(['identify-object', 'depicted', 'place', 'professor', 'material', 'date', 'definition-detective', 'odd-one-out',
    ...shuffle(['maker', 'designer', 'manufacturer', 'owner', 'related'] as QuestionKind[], random).filter(k => kinds.has(k)).slice(0, 1), dimensions[0]], random)
  const selected: Question[] = []
  const usedIds = new Set<string>(), usedImages = new Set<string>(), usedAnswers = new Set<string>()
  for (let index = 0; index < count; index++) {
    const candidates = available.filter(q => !questionObjects(q).some(o => usedIds.has(o.id) || usedImages.has(o.imageRemote)))
    const kind = preferred[index % preferred.length]
    const question = candidates.find(q => q.kind === kind && !usedAnswers.has(q.answer)) ?? candidates.find(q => q.kind === kind) ?? candidates.find(q => !usedAnswers.has(q.answer)) ?? candidates[0]
    if (!question) throw new Error(`Only ${selected.length} distinct questions available; ${count} requested.`)
    selected.push({ ...question, choices: question.photos ? question.choices : shuffle(question.choices, random) })
    questionObjects(question).forEach(o => { usedIds.add(o.id); usedImages.add(o.imageRemote) })
    usedAnswers.add(question.answer)
  }
  return selected
}
export function replacementQuestion(bank: Question[], questions: Question[], failed: Set<string>, preferred: QuestionKind): Question | undefined {
  const used = new Set(questions.flatMap(questionObjects).map(o => o.id))
  const images = new Set(questions.flatMap(questionObjects).map(o => o.imageRemote))
  const eligible = bank.filter(q => questionObjects(q).every(o => !used.has(o.id) && !failed.has(o.id) && !images.has(o.imageRemote)))
  return eligible.find(q => q.kind === preferred) ?? eligible[0]
}
