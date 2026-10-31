import type { ProfessorEvidence } from '../src/lib/game/types.ts'
import type { WikidataClaims } from './vocabularies.ts'

type Person = { kind: string; label: string; role: string; url?: string | null }
export type ProfessorSource = { id: string; description: string; creators: Person[] }
type LinkedTerm = { url: string; claims?: WikidataClaims }
const creatorRoles = new Set(['maker', 'ontwerper', 'producent'])
const academicPrefix = /^(?:(?:professor|hoogleraar)\s+|(?:prof|drs?|ir|mr)\.\s*)+/iu
const professorPrefix = /(?<![\p{L}\p{N}])(?:prof\.|professor\b|hoogleraar\b)\s*(?:(?:drs?|ir|mr)\.\s*)*$/iu
const professorSuffix = /^\s*(?:\(\d{4}\s*[–-]\s*\d{4}\)\s*)?,\s*(?:later\s+)?(?:hoogleraar|professor)\b|^\s*\(\s*(?:later\s+)?(?:hoogleraar|professor)\b[^)]{0,80}\)|^\s+(?:is|was|werd|became)\s+(?:later\s+)?(?:hoogleraar|professor)\b/iu
const negation = /\b(?:geen|niet|no|not|never|mogelijk|misschien|possibly|perhaps)\s+(?:(?:een|a|an)\s+)?$/iu
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const bareName = (label: string) => label.trim().replace(academicPrefix, '').replace(/\s+/g, ' ')

export function professorIdentity(person: Pick<Person, 'label' | 'url'>) {
  return person.url ? person.url.replace(/^http:/, 'https:').replace(/\/$/, '')
    : bareName(person.label).normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
}

/** Full surnames are required. Given names may use initials; never match a surname alone. */
function namePatterns(label: string): RegExp[] {
  const tokens = bareName(label).match(/\p{L}[\p{L}\p{M}'’-]*/gu) ?? []
  if (tokens.length < 2) return []
  const patterns = new Set<string>([tokens.map(escape).join('[\\s.]+')])
  for (let split = 1; split < tokens.length; split++) {
    const given = tokens.slice(0, split)
    if (given.some(token => /^\p{Ll}/u.test(token))) break
    const prefix = given.map(token => token.length === 1 ? `${escape(token)}[\\p{L}\\p{M}]*\\.?`
      : `(?:${escape(token)}|${escape(token[0])}\\.?)`).join('[\\s.]*')
    // Parenthesized nicknames are explicit aliases in the source, not guessed names.
    patterns.add(`${prefix}(?:\\s+\\([\\p{L}\\p{M}'’-]+\\))?\\s+${tokens.slice(split).map(escape).join('\\s+')}`)
  }
  patterns.add(`(?:[\\p{L}\\p{M}'’-]+\\s+){1,4}\\(${escape(tokens[0]!)}\\)\\s+${tokens.slice(1).map(escape).join('\\s+')}`)
  return [...patterns].map(pattern => new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, 'giu'))
}

/** Extract explicit source assertions afresh on every build; ambiguous matches simply yield no fact. */
export function deriveProfessorEvidence(records: readonly ProfessorSource[], terms: readonly LinkedTerm[] = []): Map<string, ProfessorEvidence> {
  const canonical = (url: string) => url.replace(/^http:/, 'https:').replace(/\/$/, '')
  const termsByUrl = new Map(terms.map(term => [canonical(term.url), term]))
  function professorRole(url: string, visited = new Set<string>()): boolean {
    const id = canonical(url)
    if (id === 'https://www.wikidata.org/entity/Q121594') return true
    if (visited.has(id)) return false
    visited.add(id)
    return (termsByUrl.get(id)?.claims?.P279 ?? []).some(parent => professorRole(parent, visited))
  }
  const people = new Map<string, { labels: Set<string>; patterns: RegExp[] }>()
  for (const record of records) for (const person of record.creators) {
    if (person.kind !== 'Person' || !creatorRoles.has(person.role) || !person.label) continue
    const id = professorIdentity(person)
    const entry = people.get(id) ?? { labels: new Set<string>(), patterns: [] }
    if (!entry.labels.has(person.label)) {
      entry.labels.add(person.label)
      entry.patterns.push(...namePatterns(person.label))
    }
    people.set(id, entry)
  }
  const evidence = new Map<string, ProfessorEvidence>()
  for (const record of records) {
    const creators = record.creators.filter(person => person.kind === 'Person' && creatorRoles.has(person.role))
    const creatorIds = new Set(creators.map(professorIdentity))
    for (const person of creators) {
      const term = person.url ? termsByUrl.get(canonical(person.url)) : undefined
      for (const field of ['P106', 'P39', 'P108/P39'] as const) {
        const role = term?.claims?.[field]?.find(url => professorRole(url))
        if (role) {
          evidence.set(professorIdentity(person), { objectId: record.id, field: `wikidata:${field}`, value: role, source: term!.url })
          break
        }
      }
      if (evidence.get(professorIdentity(person))?.field.startsWith('wikidata:')) continue
      const titles = person.label.match(academicPrefix)?.[0] ?? ''
      if (/\b(?:prof\.|professor|hoogleraar)/iu.test(titles)) {
        evidence.set(professorIdentity(person), { objectId: record.id, field: 'creator:name', value: person.label })
      }
    }
    if (!/\b(?:prof\.|professor|hoogleraar)/iu.test(record.description)) continue
    const matches: { id: string; start: number; end: number }[] = []
    for (const [id, person] of people) for (const pattern of person.patterns) {
      for (const match of record.description.matchAll(pattern)) {
        const nameStart = match.index, nameEnd = nameStart + match[0].length
        const before = record.description.slice(0, nameStart)
        const prefix = before.match(professorPrefix)
        const suffix = record.description.slice(nameEnd).match(professorSuffix)
        if (!prefix && !suffix) continue
        const start = prefix ? prefix.index! : nameStart
        const end = prefix ? nameEnd : nameEnd + suffix![0].length
        if (negation.test(record.description.slice(0, start))) continue
        matches.push({ id, start, end })
      }
    }
    for (const match of matches) {
      if (!creatorIds.has(match.id) || evidence.has(match.id)) continue
      if (matches.some(other => other.id !== match.id && other.start < match.end && match.start < other.end)) continue
      evidence.set(match.id, { objectId: record.id, field: 'description:professorship',
        value: record.description.slice(match.start, match.end) })
    }
  }
  return evidence
}
