import type { GameData, GameObject, Language, Question } from '../types.ts'
import { dateRange } from './metadata.ts'
import { hash, randomSource, shuffle } from './random.ts'

export function oddOneOutQuestions(data: GameData, language: Language): Question[] {
  const dated = data.objects.flatMap(object => {
    const range = object.date && dateRange(object.date)
    return range ? [{ object, range }] : []
  })
  const groups = new Map<number, GameObject[]>()
  for (const { object, range } of dated) {
    const period = Math.floor(range[0] / 100) * 100
    if (range[1] <= period + 99) groups.set(period, [...(groups.get(period) ?? []), object])
  }
  return dated.flatMap(({ object, range }) => {
    const random = randomSource(hash(`odd:${object.id}`))
    const options = shuffle([...groups.entries()], random).filter(([period, group]) => group.length >= 3 && (range[1] < period || range[0] > period + 99))
    for (const [period, group] of options) {
      const companions: GameObject[] = []
      for (const candidate of shuffle(group, random)) {
        if (candidate.imageRemote === object.imageRemote || companions.some(o => o.imageRemote === candidate.imageRemote) ||
          candidate.facts.related?.includes(`related:${object.source}`) || object.facts.related?.includes(`related:${candidate.source}`)) continue
        companions.push(candidate)
        if (companions.length === 3) break
      }
      if (companions.length !== 3) continue
      const photos = shuffle([object, ...companions], random)
      const answer = 'ABCD'[photos.indexOf(object)]
      return [{ id: `odd:${object.id}`, kind: 'odd-one-out', object, language,
        prompt: language === 'nl' ? `Welk object dateert van buiten ${period}–${period + 99}?` : `Which object is dated outside ${period}–${period + 99}?`,
        photos, answer, choices: ['A', 'B', 'C', 'D'],
        explanation: `${language === 'nl' ? 'Datering in de collectie' : 'Collection dating'}: ${photos.map((o, i) => `${'ABCD'[i]}: ${o.date!.replace('/', '–')}`).join('; ')}.`,
        evidence: photos.map(o => ({ objectId: o.id, field: 'temporalCoverage', values: [o.date!], source: o.source })), seconds: 30 } satisfies Question]
    }
    return []
  })
}
