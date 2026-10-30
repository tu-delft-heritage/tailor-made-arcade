import type { GameObject, Language, Question } from './types.ts'

const reportCopy = {
  nl: {
    subject: 'Tailor-Made Arcade: mogelijke fout in collectiemetadata',
    greeting: 'Beste conservator,',
    intro: 'Tijdens het spelen van Tailor-Made Arcade zag ik een mogelijke fout in de collectiemetadata. Kunt u dit controleren?',
    comment: 'Mijn opmerking of voorgestelde correctie:',
    placeholder: '[Beschrijf hier wat er volgens u niet klopt.]',
    question: 'Vraag', clue: 'Aanwijzing', choices: 'Antwoordopties',
    answer: 'Antwoord volgens het spel', selected: 'Mijn gekozen antwoord',
    explanation: 'Toelichting in het spel', objects: 'Betrokken erfgoedobjecten',
    closing: 'Alvast bedankt!\nMet vriendelijke groet,\n[Uw naam]'
  },
  en: {
    subject: 'Tailor-Made Arcade: possible collection metadata error',
    greeting: 'Dear curator,',
    intro: 'While playing Tailor-Made Arcade, I noticed a possible error in the collection metadata. Could you please check it?',
    comment: 'My comment or suggested correction:',
    placeholder: '[Please describe what you think is incorrect.]',
    question: 'Question', clue: 'Clue', choices: 'Answer options',
    answer: 'Answer according to the game', selected: 'My selected answer',
    explanation: 'Explanation in the game', objects: 'Related heritage objects',
    closing: 'Thank you!\nKind regards,\n[Your name]'
  }
} satisfies Record<Language, Record<string, string>>

/** Draft only: the player's email application handles editing and sending. */
export function metadataReportMailto(question: Question, selected: string | null, collection: readonly GameObject[]): string {
  const text = reportCopy[question.language]
  const pictured = question.photos ?? [question.object]
  const ids = new Set([
    ...pictured.map(object => object.id), question.object.id,
    ...(question.answerObjectId ? [question.answerObjectId] : []),
    ...question.evidence.map(item => item.objectId)
  ])
  const objects = [...ids].map(id => {
    const object = pictured.find(object => object.id === id) ?? collection.find(object => object.id === id)
    const photoIndex = question.photos?.findIndex(object => object.id === id) ?? -1
    const letter = photoIndex >= 0 ? `${'ABCD'[photoIndex]}: ` : ''
    const label = object ? `${object.title} (${object.identifier})` : id
    return `${letter}${label}\nhttps://heritage.tudelft.nl/objects/${encodeURIComponent(id)}`
  })
  const body = [
    text.greeting, text.intro, `${text.comment}\n${text.placeholder}`,
    `${text.question}:\n${question.prompt}`,
    ...(question.clue ? [`${text.clue}:\n${question.clue}`] : []),
    `${text.choices}:\n${question.choices.map(choice => `- ${choice}`).join('\n')}`,
    `${text.answer}: ${question.answer}`,
    ...(selected !== null ? [`${text.selected}: ${selected}`] : []),
    `${text.explanation}:\n${question.explanation}`,
    `${text.objects}:\n${objects.join('\n\n')}`,
    text.closing
  ].join('\n\n').replace(/\r?\n/g, '\r\n')
  return `mailto:library@tudelft.nl?subject=${encodeURIComponent(text.subject)}&body=${encodeURIComponent(body)}`
}
