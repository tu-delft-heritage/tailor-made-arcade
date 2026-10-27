import type { Language } from './types.ts'

/** Only exact, unqualified years/ranges can be shortened without losing source detail. */
export function dateRange(value: string): [number, number] | null {
  const match = value.trim().match(/^(\d{4})(?:\s*[/–—-]\s*(\d{4}))?$/)
  if (!match) return null
  const start = Number(match[1]), end = Number(match[2] ?? match[1])
  return start > 0 && start <= end ? [start, end] : null
}

const ordinal = (number: number) => `${number}${number % 100 >= 11 && number % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[number % 10] ?? 'th')}`

export function formatDate(value: string, language: Language): string {
  const range = dateRange(value)
  if (!range) return value
  const [start, end] = range
  if (start === end) return String(start)
  if (start % 100 === 0 && end === start + 99) {
    const century = Math.floor(start / 100) + 1
    return language === 'nl' ? `${century}e eeuw` : `${ordinal(century)} century`
  }
  if (start % 10 === 0 && end === start + 9) return language === 'nl' ? `jaren ${start}` : `${start}s`
  return `${start}–${end}`
}
