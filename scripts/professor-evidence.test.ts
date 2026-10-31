import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deriveProfessorEvidence, professorIdentity, type ProfessorSource } from './professor-evidence.ts'

const person = (label: string, url?: string) => ({ kind: 'Person', role: 'maker', label, url })
const record = (label: string, description: string, id = label): ProfessorSource => ({ id, description, creators: [person(label)] })

test('extracts explicit titles, initials, nicknames and later professorship without a name list', () => {
  const fixtures = [
    record('prof. dr. ir. Alex Example', ''),
    record('J.W. Sample', 'Ontworpen door hoogleraar Jan Willem Sample.'),
    record('Maria Jane Example', 'Ontworpen door prof.dr.ir. M.J. Example.'),
    record('Abraham Frans Sample', 'Zelfportret van prof. Abraham Frans (Bram) Sample.'),
    record('Huib Sample', 'Zelfportret van prof. Hubert Marie (Huib) Sample.'),
    record('Willem Louis van der Test', 'Ontwerp van W. L. van der Test (later hoogleraar bij de TU Delft).'),
    record('Alice Example', 'Alice Example (1900–1980), hoogleraar aan de universiteit.')
  ]
  const result = deriveProfessorEvidence(fixtures)
  assert.equal(result.size, fixtures.length)
  for (const fixture of fixtures) {
    const evidence = result.get(professorIdentity(fixture.creators[0]))!
    assert.equal(evidence.objectId, fixture.id)
    assert.ok((evidence.field === 'creator:name' ? fixture.creators[0].label : fixture.description).includes(evidence.value))
  }
})

test('a depicted professor, doctorate, surname-only mention or negated title cannot classify the maker', () => {
  for (const description of [
    'Portret van prof. Alice Scientist. Geschilderd door John Artist.',
    'Ontworpen door dr. John Artist.',
    'Ontworpen door professor Artist.',
    'Dit is geen professor John Artist.',
    'John Artist was geen hoogleraar.',
    'De hoogleraar adviseerde John Artist.'
  ]) assert.equal(deriveProfessorEvidence([record('John Artist', description)]).size, 0, description)
  assert.equal(deriveProfessorEvidence([{ id: 'owner', description: 'Prof. John Artist.',
    creators: [{ ...person('John Artist'), role: 'had in bezit' }] }]).size, 0)
})

test('ambiguous initials are skipped and a source change removes stale evidence automatically', () => {
  const john = record('John Smith', 'Dit instrument is van prof. J. Smith.')
  const james = record('James Smith', '')
  assert.equal(deriveProfessorEvidence([john, james]).size, 0)
  assert.equal(deriveProfessorEvidence([{ ...john, description: 'Prof. John Smith.' }, james]).size, 1)
  assert.equal(deriveProfessorEvidence([{ ...john, description: 'John Smith.' }, james]).size, 0)
})

test('linked occupations and employment positions take precedence and follow cached subclass statements', () => {
  const url = 'http://www.wikidata.org/entity/Q1', role = 'http://www.wikidata.org/entity/Q2'
  const source = { id: 'object', description: 'Prof. Alex Example.', creators: [person('Alex Example', url)] }
  for (const field of ['P106', 'P39', 'P108/P39'] as const) {
    const evidence = deriveProfessorEvidence([source], [
      { url, claims: { [field]: [role] } },
      { url: role, claims: { P279: ['http://www.wikidata.org/entity/Q121594'] } }
    ]).get(professorIdentity(source.creators[0]))!
    assert.equal(evidence.field, `wikidata:${field}`)
    assert.equal(evidence.value, role)
    assert.equal(evidence.source, url)
  }
})

test('university teaching, a university employer or a cyclic taxonomy alone do not imply professorship', () => {
  const url = 'http://www.wikidata.org/entity/Q1', other = 'http://www.wikidata.org/entity/Q2'
  const source = { id: 'object', description: '', creators: [person('Alex Example', url)] }
  assert.equal(deriveProfessorEvidence([source], [
    { url, claims: { P106: ['http://www.wikidata.org/entity/Q1622272'], P39: [other] } },
    { url: other, claims: { P279: [other] } }
  ]).size, 0)
})

test('source identity shares evidence only across matching people, including normalized linked URLs', () => {
  const first = record('Alex Example', 'Prof. Alex Example.', 'one')
  const second = record('Alex Example', '', 'two')
  assert.equal(deriveProfessorEvidence([first, second]).get(professorIdentity(second.creators[0]))?.objectId, 'one')
  assert.equal(professorIdentity(person('Alex', 'http://www.wikidata.org/entity/Q1')),
    professorIdentity(person('Alexander', 'https://www.wikidata.org/entity/Q1/')))
  assert.notEqual(professorIdentity(person('Alex', 'http://www.wikidata.org/entity/Q1')),
    professorIdentity(person('Alex', 'http://www.wikidata.org/entity/Q2')))
})
