import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fetchVocabularies } from './fetch-vocabularies.ts'
import { collectSameAs, parseGeonames, parseSkos, parseWikidata } from './vocabularies.ts'

const SKOS = 'http://www.w3.org/2004/02/skos/core#'
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
const url = 'http://vocab.getty.edu/aat/300010900'
const skos = {
  '@graph': [
    { '@id': url,
      [`${SKOS}prefLabel`]: [{ '@language': 'nl', '@value': 'metaal' }, { '@language': 'en', '@value': 'metal' }],
      [`${SKOS}scopeNote`]: [{ '@id': 'urn:note:nl' }, { '@id': 'urn:note:en' }],
      [`${SKOS}altLabel`]: { '@language': 'en', '@value': 'metals' } },
    { '@id': 'urn:note:nl', [`${RDF}value`]: { '@language': 'nl', '@value': 'Nederlandse omschrijving.' } },
    { '@id': 'urn:note:en', [`${RDF}value`]: { '@language': 'en', '@value': 'English description.' } },
    { '@id': 'urn:other', [`${SKOS}scopeNote`]: { '@language': 'en', '@value': 'Unrelated description.' } }
  ]
}

test('discovers nested sameAs references and deduplicates known HTTP/HTTPS identities', () => {
  const entries = collectSameAs({
    material: [{ sameAs: [url, url.replace('http:', 'https:')] }],
    creator: { creator: { sameAs: { '@id': 'https://www.wikidata.org/entity/Q1' } } },
    isRelatedTo: { sameAs: 'https://heritage.tudelft.nl/iiif/manifests/abc/schema.json' }
  }, 'objects/test/schema.json')
  assert.equal(entries.size, 3)
  assert.equal(entries.get(url)?.sourceUrls.length, 2)
  assert.deepEqual(entries.get(url)?.references, [{ file: 'objects/test/schema.json', property: '/material/0/sameAs' }])
  assert.equal(entries.get('http://www.wikidata.org/entity/Q1')?.references[0].property, '/creator/creator/sameAs')
  assert.equal([...entries.values()].find(entry => entry.provider === 'collection-object')?.requestUrl, undefined)
  assert.throws(() => collectSameAs({ sameAs: 5 }, 'test'), /Invalid sameAs/)
})

test('extracts Getty referenced notes without leaking unrelated graph descriptions', () => {
  const term = parseSkos(skos, url)
  assert.deepEqual(term.labels, { nl: ['metaal'], en: ['metal'] })
  assert.deepEqual(term.descriptions, { nl: ['Nederlandse omschrijving.'], en: ['English description.'] })
  assert.deepEqual(term.aliases, { en: ['metals'] })
  assert.throws(() => parseSkos(skos, `${url}0`), /does not describe/)
  assert.throws(() => parseSkos({ '@graph': skos['@graph'].slice(0, 1) }, url), /missing the referenced/)
})

test('reads Cultureelerfgoed named graphs and inline language literals', () => {
  const term = parseSkos([{ '@id': 'urn:thesaurus', '@graph': [{ '@id': url,
    [`${SKOS}prefLabel`]: [{ '@language': 'nl', '@value': 'hoekspiegels' }],
    [`${SKOS}scopeNote`]: [{ '@language': 'nl-NL', '@value': 'Een beschrijving.' },
      { '@language': 'de', '@value': 'Andere Sprache.' }],
    [`${SKOS}definition`]: { '@language': 'en', '@value': 'A definition.' }
  }] }], url)
  assert.deepEqual(term.descriptions, { nl: ['Een beschrijving.'], en: ['A definition.'] })
})

test('preserves Wikidata language gaps rather than manufacturing translations', () => {
  const term = parseWikidata({ entities: { Q1: { id: 'Q1', labels: { en: { value: 'Name' } },
    descriptions: { nl: { value: 'Nederlandse omschrijving' } }, aliases: { en: [{ value: 'Alias' }] } } } },
  'http://www.wikidata.org/entity/Q1')
  assert.deepEqual(term.labels, { en: ['Name'] })
  assert.deepEqual(term.descriptions, { nl: ['Nederlandse omschrijving'] })
  assert.deepEqual(term.aliases, { en: ['Alias'] })
  assert.throws(() => parseWikidata({ entities: {} }, 'http://www.wikidata.org/entity/Q1'), /does not describe/)
})

test('parses GeoNames RDF, keeping untagged names separate from translations', () => {
  const xml = `<rdf:RDF xmlns:rdf="${RDF}" xmlns:gn="http://www.geonames.org/ontology#">
    <gn:Feature rdf:about="https://sws.geonames.org/1/">
      <gn:name>Place &amp; town</gn:name>
      <gn:officialName xml:lang="nl">Plaats</gn:officialName>
      <gn:alternateName xml:lang="en">Town</gn:alternateName>
    </gn:Feature></rdf:RDF>`
  assert.deepEqual(parseGeonames(xml, 'https://www.geonames.org/1'), {
    labels: { und: ['Place & town'], nl: ['Plaats'] }, aliases: { en: ['Town'] }, descriptions: {}
  })
  assert.throws(() => parseGeonames(xml, 'https://www.geonames.org/2'), /does not describe/)
  assert.throws(() => parseGeonames('<broken>', 'https://www.geonames.org/1'), /Invalid GeoNames/)
  assert.throws(() => parseGeonames('<!DOCTYPE rdf SYSTEM "file:///test">', 'https://www.geonames.org/1'), /entity declaration/)
})

test('caches once, rebuilds offline, and retains valid data on a failed refresh', async t => {
  const root = await mkdtemp(join(tmpdir(), 'vocabulary-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const schemas = join(root, 'schemas')
  const cache = join(root, 'cache')
  const output = join(root, 'data')
  await mkdir(schemas)
  await writeFile(join(schemas, 'schema.json'), JSON.stringify({ material: [{ sameAs: url }, { sameAs: url }] }))
  let calls = 0
  const fetcher: typeof fetch = async () => { calls++; return new Response(JSON.stringify(skos)) }
  const options = { schemas, cache, output, fetcher }
  const first = await fetchVocabularies(options)
  assert.equal(calls, 1)
  assert.equal(first.cachedTerms, 1)
  assert.deepEqual(first.descriptions, { nl: 1, en: 1 })
  const inventory = JSON.parse(await readFile(join(cache, 'vocabulary-urls.json'), 'utf8'))
  assert.equal(inventory.urls.length, 1)
  assert.equal(inventory.urls[0].url, url)
  assert.equal(inventory.urls[0].references.length, 2)
  await assert.rejects(stat(join(output, 'vocabulary-urls.json')), { code: 'ENOENT' })
  const target = join(output, 'vocabularies.json')
  const original = await readFile(target, 'utf8')
  const modified = (await stat(target)).mtimeMs
  const offline = await fetchVocabularies({ ...options, offline: true })
  assert.equal(offline.reused, 1)
  assert.equal(calls, 1)
  assert.equal((await stat(target)).mtimeMs, modified)
  const failed = await fetchVocabularies({ ...options, refresh: true,
    fetcher: async () => { calls++; return new Response('Not found', { status: 404 }) } })
  assert.equal(calls, 2) // Permanent errors are not retried.
  assert.equal(failed.failures.length, 1)
  assert.equal(failed.failures[0].cachedCopyRetained, true)
  assert.equal(await readFile(target, 'utf8'), original)
  const malformed = await fetchVocabularies({ ...options, refresh: true,
    fetcher: async () => new Response('<html>Not JSON</html>') })
  assert.equal(malformed.failures.length, 1)
  assert.equal(await readFile(target, 'utf8'), original)
  const final = await fetchVocabularies({ ...options, offline: true })
  assert.equal(final.failures.length, 0)
  assert.equal(final.reused, 1)
  await mkdir(join(output, '.vocabularies.lock'))
  await assert.rejects(fetchVocabularies(options), /locked/)
  await stat(join(output, '.vocabularies.lock'))
  await assert.rejects(stat(join(cache, '.vocabularies.lock')), { code: 'ENOENT' })
})

test('reports unsupported URLs and absent offline records, while indexing collection links', async t => {
  const root = await mkdtemp(join(tmpdir(), 'vocabulary-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const schemas = join(root, 'schemas')
  await mkdir(schemas)
  await writeFile(join(schemas, 'schema.json'), JSON.stringify({ sameAs: [url, 'https://example.org/term',
    'https://heritage.tudelft.nl/iiif/manifests/abc/schema.json'] }))
  const result = await fetchVocabularies({ schemas, cache: join(root, 'cache'), output: join(root, 'data'),
    offline: true, fetcher: async () => { throw new Error('Must not access the network') } })
  assert.equal(result.uniqueUrls, 3)
  assert.equal(result.collectionObjectUrls, 1)
  assert.equal(result.failures.length, 2)
  assert.equal(result.cachedTerms, 0)
})

const itemSnak = (id: string) => ({ snaktype: 'value', datavalue: { value: { 'entity-type': 'item', id } } })
const statement = (id: string, rank = 'normal') => ({ rank, mainsnak: itemSnak(id) })

test('keeps explicit Wikidata occupation and position statements, excluding deprecated and unknown values', () => {
  const term = parseWikidata({ entities: { Q1: { id: 'Q1', claims: {
    P106: [statement('Q2'), statement('Q3', 'deprecated'), { mainsnak: { snaktype: 'novalue' } }],
    P39: [statement('Q4', 'preferred')],
    P108: [{ ...statement('Q5'), qualifiers: { P39: [itemSnak('Q6')] } },
      { ...statement('Q5', 'deprecated'), qualifiers: { P39: [itemSnak('Q7')] } }],
    P279: [statement('Q8')]
  } } } }, 'http://www.wikidata.org/entity/Q1')
  assert.deepEqual(term.claims, {
    P106: ['http://www.wikidata.org/entity/Q2'], P39: ['http://www.wikidata.org/entity/Q4'],
    'P108/P39': ['http://www.wikidata.org/entity/Q6'], P279: ['http://www.wikidata.org/entity/Q8']
  })
})

test('follows linked role subclasses, reuses existing terms and rebuilds the same claims offline', async t => {
  const root = await mkdtemp(join(tmpdir(), 'role-vocabulary-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const schemas = join(root, 'schemas'), cache = join(root, 'cache'), output = join(root, 'data')
  await mkdir(schemas)
  await writeFile(join(schemas, 'schema.json'), JSON.stringify({ sameAs: [
    'http://www.wikidata.org/entity/Q1', 'http://www.wikidata.org/entity/Q2'
  ] }))
  const claims: Record<string, unknown> = {
    Q1: { P108: [{ ...statement('Q9'), qualifiers: { P39: [itemSnak('Q2')] } }] },
    Q2: { P279: [statement('Q3')] },
    Q3: { P279: [statement('Q121594'), statement('Q2')] }
  }
  const requested: string[] = []
  const fetcher: typeof fetch = async input => {
    const id = String(input).match(/(Q\d+)\.json$/)![1]!
    requested.push(id)
    assert.ok(claims[id], 'Only explicit linked roles should be fetched')
    return new Response(JSON.stringify({ entities: { [id]: { id, claims: claims[id] } } }))
  }
  const options = { schemas, cache, output, fetcher }
  const result = await fetchVocabularies(options)
  assert.deepEqual(requested.sort(), ['Q1', 'Q2', 'Q3'])
  assert.equal(result.linkedRoleUrls, 1)
  assert.equal(result.failures.length, 0)
  const original = await readFile(join(output, 'vocabularies.json'), 'utf8')
  await fetchVocabularies({ ...options, offline: true, fetcher: async () => { throw new Error('Offline must not fetch') } })
  assert.equal(await readFile(join(output, 'vocabularies.json'), 'utf8'), original)
})
