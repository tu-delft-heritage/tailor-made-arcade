import { XMLParser, XMLValidator } from 'fast-xml-parser'

type JsonObject = Record<string, unknown>
export type Provider = 'getty' | 'cultureelerfgoed' | 'wikidata' | 'geonames' | 'collection-object' | 'unsupported'
export type Languages = Partial<Record<'nl' | 'en' | 'und', string[]>>
export type Vocabulary = {
  labels: Languages
  aliases: Languages
  descriptions: Languages
}
export type Reference = { file: string; property: string }
export type VocabularyUrl = {
  url: string
  provider: Provider
  requestUrl?: string
  sourceUrls: string[]
  references: Reference[]
}

const SKOS = 'http://www.w3.org/2004/02/skos/core#'
const SKOSXL = 'http://www.w3.org/2008/05/skos-xl#'
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'

export const array = (value: unknown): unknown[] => value == null ? [] : Array.isArray(value) ? value : [value]
const object = (value: unknown): JsonObject => value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {}
const text = (value: unknown) => typeof value === 'string' ? value : undefined
const comparable = (url: string) => url.replace(/^http:/, 'https:').replace(/\/$/, '')

export function identifyUrl(input: string): Pick<VocabularyUrl, 'url' | 'provider' | 'requestUrl'> {
  let parsed: URL
  try { parsed = new URL(input) } catch { return { url: input, provider: 'unsupported' } }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.port) {
    return { url: input, provider: 'unsupported' }
  }
  const path = parsed.pathname.replace(/\/$/, '')
  if (parsed.hostname === 'vocab.getty.edu' && /^\/(aat|tgn|ulan)\/\d+$/.test(path)) {
    return { url: `http://vocab.getty.edu${path}`, provider: 'getty', requestUrl: `https://vocab.getty.edu${path}.jsonld` }
  }
  if (parsed.hostname === 'data.cultureelerfgoed.nl' && /^\/term\/id\/cht\/[a-f0-9-]+$/.test(path)) {
    const url = `https://data.cultureelerfgoed.nl${path}`
    return { url, provider: 'cultureelerfgoed', requestUrl: `${url}.jsonld` }
  }
  const wikidata = path.match(/^\/(?:entity|wiki)\/(Q\d+)$/)
  if (['www.wikidata.org', 'wikidata.org'].includes(parsed.hostname) && wikidata) {
    return { url: `http://www.wikidata.org/entity/${wikidata[1]}`, provider: 'wikidata',
      requestUrl: `https://www.wikidata.org/wiki/Special:EntityData/${wikidata[1]}.json` }
  }
  const geonames = path.match(/^\/(\d+)$/)
  if (['www.geonames.org', 'sws.geonames.org', 'geonames.org'].includes(parsed.hostname) && geonames) {
    return { url: `https://www.geonames.org/${geonames[1]}`, provider: 'geonames',
      requestUrl: `https://sws.geonames.org/${geonames[1]}/about.rdf` }
  }
  if (parsed.hostname === 'heritage.tudelft.nl' && /^\/iiif\/manifests\/[a-f0-9-]+\/schema.json$/.test(path)) {
    return { url: `https://heritage.tudelft.nl${path}`, provider: 'collection-object' }
  }
  return { url: input, provider: 'unsupported' }
}

/** Recursively find sameAs at any depth, including arrays and JSON-LD ID objects. */
export function collectSameAs(document: unknown, file: string, index = new Map<string, VocabularyUrl>()) {
  function walk(value: unknown, path: string[]) {
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, [...path, String(i)]))
      return
    }
    for (const [key, child] of Object.entries(object(value))) {
      if (key === 'sameAs') {
        for (const item of array(child)) {
          const url = text(item) ?? text(object(item)['@id']) ?? text(object(item).id)
          if (!url) throw new Error(`Invalid sameAs value in ${file} at /${path.join('/')}`)
          const identity = identifyUrl(url)
          const entry = index.get(identity.url) ?? { ...identity, sourceUrls: [], references: [] }
          if (!entry.sourceUrls.includes(url)) entry.sourceUrls.push(url)
          const property = '/' + [...path, key].map(part => part.replaceAll('~', '~0').replaceAll('/', '~1')).join('/')
          if (!entry.references.some(ref => ref.file === file && ref.property === property)) {
            entry.references.push({ file, property })
          }
          index.set(entry.url, entry)
        }
      } else walk(child, [...path, key])
    }
  }
  walk(document, [])
  return index
}

function add(target: Languages, language: unknown, value: unknown) {
  const lang = typeof language === 'string' ? language.toLowerCase().split('-')[0] : 'und'
  if (!['nl', 'en', 'und'].includes(lang) || typeof value !== 'string' || !value.trim()) return
  const values = target[lang as keyof Languages] ??= []
  if (!values.includes(value.trim())) values.push(value.trim())
}

/** Parse expanded SKOS JSON-LD; follow note/label nodes inside this response only. */
export function parseSkos(document: unknown, url: string): Vocabulary {
  const nodes = new Map<string, JsonObject>()
  function visit(value: unknown) {
    for (const item of array(value)) {
      const node = object(item)
      const id = text(node['@id'])
      if (id) nodes.set(comparable(id), { ...nodes.get(comparable(id)), ...node })
      if (node['@graph']) visit(node['@graph'])
    }
  }
  visit(document)
  const root = nodes.get(comparable(url))
  if (!root) throw new Error(`JSON-LD response does not describe ${url}`)
  const result: Vocabulary = { labels: {}, aliases: {}, descriptions: {} }
  function literals(value: unknown, target: Languages, seen = new Set<string>()) {
    for (const item of array(value)) {
      if (typeof item === 'string') { add(target, undefined, item); continue }
      const node = object(item)
      if (node['@value'] !== undefined) add(target, node['@language'], node['@value'])
      const id = text(node['@id'])
      if (id && !seen.has(id)) {
        seen.add(id)
        const linked = nodes.get(comparable(id))
        if (linked) {
          literals(linked[`${RDF}value`], target, seen)
          literals(linked[`${SKOSXL}literalForm`], target, seen)
        } else {
          throw new Error(`JSON-LD is missing the referenced label or note ${id}`)
        }
      }
    }
  }
  literals(root[`${SKOS}prefLabel`], result.labels)
  literals(root[`${SKOSXL}prefLabel`], result.labels)
  literals(root[`${SKOS}altLabel`], result.aliases)
  literals(root[`${SKOSXL}altLabel`], result.aliases)
  literals(root[`${SKOS}scopeNote`], result.descriptions)
  literals(root[`${SKOS}definition`], result.descriptions)
  return result
}

export function parseWikidata(document: unknown, url: string): Vocabulary {
  const id = url.split('/').at(-1)!
  const entity = object(object(object(document).entities)[id])
  if (entity.id !== id || 'missing' in entity) throw new Error(`Wikidata response does not describe ${id}`)
  const result: Vocabulary = { labels: {}, aliases: {}, descriptions: {} }
  for (const lang of ['nl', 'en']) {
    add(result.labels, lang, object(object(entity.labels)[lang]).value)
    add(result.descriptions, lang, object(object(entity.descriptions)[lang]).value)
    for (const alias of array(object(entity.aliases)[lang])) add(result.aliases, lang, object(alias).value)
  }
  return result
}

export function parseGeonames(body: string, url: string): Vocabulary {
  if (/<!DOCTYPE|<!ENTITY/i.test(body)) throw new Error('Unexpected XML entity declaration')
  const valid = XMLValidator.validate(body)
  if (valid !== true) throw new Error(`Invalid GeoNames XML: ${valid.err.msg}`)
  const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false })
  const rdf = object(object(parser.parse(body)).RDF)
  const id = url.split('/').at(-1)!
  const feature = [...array(rdf.Feature), ...array(rdf.Description)].map(object).find(node =>
    text(node['@_about'])?.match(new RegExp(`geonames\\.org/${id}/?$`)))
  if (!feature) throw new Error(`GeoNames response does not describe ${id}`)
  const result: Vocabulary = { labels: {}, aliases: {}, descriptions: {} }
  function values(input: unknown, target: Languages) {
    for (const item of array(input)) {
      if (typeof item === 'string') add(target, undefined, item)
      else add(target, object(item)['@_lang'], object(item)['#text'])
    }
  }
  values(feature.name, result.labels)
  values(feature.officialName, result.labels)
  values(feature.alternateName, result.aliases)
  values(feature.description, result.descriptions)
  // GeoNames normally has no prose descriptions; leave them empty rather than
  // turning names or feature codes into invented descriptions/translations.
  return result
}

export function parseVocabulary(provider: Provider, body: string, url: string): Vocabulary {
  const result = provider === 'geonames' ? parseGeonames(body, url)
    : provider === 'wikidata' ? parseWikidata(JSON.parse(body), url) : parseSkos(JSON.parse(body), url)
  if (![result.labels, result.aliases, result.descriptions].some(values => Object.keys(values).length)) {
    throw new Error(`No Dutch, English, or untagged vocabulary text found for ${url}`)
  }
  return result
}
