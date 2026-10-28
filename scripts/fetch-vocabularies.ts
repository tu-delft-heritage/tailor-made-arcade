import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { listFiles } from './fetch-iiif.ts'
import { collectSameAs, parseVocabulary } from './vocabularies.ts'
import type { Vocabulary, VocabularyUrl } from './vocabularies.ts'

const project = fileURLToPath(new URL('../', import.meta.url))
type ResponseCache = {
  version: 1
  url: string
  requestUrl: string
  responseUrl: string
  fetchedAt: string
  contentType: string
  body: string
}
type Term = Vocabulary & {
  url: string
  provider: VocabularyUrl['provider']
  source: { requestUrl: string; responseUrl: string; fetchedAt: string }
}
type Options = {
  schemas?: string
  cache?: string
  output?: string
  refresh?: boolean
  offline?: boolean
  concurrency?: number
  fetcher?: typeof fetch
}

async function readCache(path: string): Promise<ResponseCache | undefined> {
  try {
    const value = JSON.parse(await readFile(path, 'utf8')) as ResponseCache
    return value.version === 1 && typeof value.body === 'string' ? value : undefined
  } catch (error) {
    if (error instanceof SyntaxError || (error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }
}

async function writeJson(path: string, value: unknown) {
  const contents = JSON.stringify(value, null, 2) + '\n'
  try { if (await readFile(path, 'utf8') === contents) return } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.tmp`
  try {
    await writeFile(temporary, contents)
    await rename(temporary, path)
  } finally {
    await rm(temporary, { force: true })
  }
}

class HttpError extends Error {
  retryable: boolean
  delay: number
  constructor(status: number, url: string, retryAfter: string | null) {
    super(`HTTP ${status} for ${url}${retryAfter ? ` (Retry-After: ${retryAfter})` : ''}`)
    this.retryable = status === 429 || status >= 500
    this.delay = retryAfter ? Math.max(0, /^\d+$/.test(retryAfter)
      ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.now()) : 0
  }
}

async function download(entry: VocabularyUrl, fetcher: typeof fetch): Promise<ResponseCache> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetcher(entry.requestUrl!, {
        headers: {
          Accept: entry.provider === 'geonames' ? 'application/rdf+xml' : 'application/ld+json, application/json',
          'User-Agent': 'TailorMadeArcade/0.1 (TU Delft heritage vocabulary cache)'
        },
        signal: AbortSignal.timeout(30_000)
      })
      if (!response.ok) {
        await response.body?.cancel()
        throw new HttpError(response.status, entry.requestUrl!, response.headers.get('retry-after'))
      }
      return { version: 1, url: entry.url, requestUrl: entry.requestUrl!,
        responseUrl: response.url || entry.requestUrl!, fetchedAt: new Date().toISOString(),
        contentType: response.headers.get('content-type') ?? '', body: await response.text() }
    } catch (error) {
      if (attempt >= 2 || (error instanceof HttpError && (!error.retryable || error.delay > 30_000))) throw error
      await sleep(Math.max(1000 * 2 ** attempt, error instanceof HttpError ? error.delay || 0 : 0))
    }
  }
}

function termFromResponse(entry: VocabularyUrl, response: ResponseCache): Term {
  return {
    url: entry.url,
    provider: entry.provider,
    ...parseVocabulary(entry.provider, response.body, entry.url),
    source: { requestUrl: response.requestUrl, responseUrl: response.responseUrl, fetchedAt: response.fetchedAt }
  }
}

export async function fetchVocabularies(options: Options = {}) {
  const schemas = resolve(options.schemas ?? join(project, '.cache/iiif/schemas'))
  const cache = resolve(options.cache ?? join(project, '.cache/vocabularies'))
  const output = resolve(options.output ?? join(project, 'data'))
  const concurrency = options.concurrency ?? 3
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error('Concurrency must be an integer from 1 to 8.')
  if (options.refresh && options.offline) throw new Error('--refresh and --offline cannot be combined.')
  const paths = (await listFiles(schemas)).filter(path => path.split('/').at(-1) === 'schema.json')
  if (!paths.length) throw new Error('No schema.json files found. Run pnpm fetch:iiif first.')
  const index = new Map<string, VocabularyUrl>()
  for (const path of paths) collectSameAs(JSON.parse(await readFile(join(schemas, path), 'utf8')), path, index)
  if (!index.size) throw new Error('No sameAs URLs found; existing output was preserved.')
  const entries = [...index.values()].sort((a, b) => a.url.localeCompare(b.url))
  for (const entry of entries) entry.sourceUrls.sort()

  // Lock both output and raw cache: different custom directories must not race.
  const locks: string[] = []
  try {
    for (const directory of [...new Set([output, cache])].sort()) {
      await mkdir(directory, { recursive: true })
      const lock = join(directory, '.vocabularies.lock')
      try { await mkdir(lock) } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
          throw new Error(`Vocabulary fetch is locked: ${lock}. Remove it only if no fetch is running.`)
        }
        throw error
      }
      locks.push(lock)
    }
    await writeJson(join(output, 'vocabulary-urls.json'), { version: 1, urls: entries })
    const remote = entries.filter(entry => entry.provider !== 'collection-object')
    console.log(`Found ${entries.length} unique sameAs targets: ${remote.length} external, ${entries.length - remote.length} collection-object links.`)
    const terms: Term[] = []
    const failures: { url: string; requestUrl?: string; error: string; cachedCopyRetained: boolean }[] = []
    let cursor = 0
    let completed = 0
    let fetched = 0
    let reused = 0
    async function worker() {
      while (cursor < remote.length) {
        const entry = remote[cursor++]
        const path = join(cache, 'responses', createHash('sha256').update(entry.url).digest('hex') + '.json')
        let previous: ResponseCache | undefined
        let previousTerm: Term | undefined
        try {
          if (!entry.requestUrl) throw new Error(`No adapter for ${entry.url}`)
          previous = await readCache(path)
          if (previous?.url !== entry.url || previous?.requestUrl !== entry.requestUrl) previous = undefined
          if (previous) {
            try { previousTerm = termFromResponse(entry, previous) } catch { /* Refetch invalid/obsolete cache. */ }
          }
          if (previousTerm && !options.refresh) {
            terms.push(previousTerm)
            reused++
          } else {
            if (options.offline) throw new Error('No valid cached response available in offline mode')
            const response = await download(entry, options.fetcher ?? fetch)
            const term = termFromResponse(entry, response)
            // A malformed response must never replace the last valid one.
            await writeJson(path, response)
            terms.push(term)
            fetched++
          }
        } catch (error) {
          if (previousTerm) terms.push(previousTerm)
          const message = error instanceof Error ? error.message : String(error)
          failures.push({ url: entry.url, requestUrl: entry.requestUrl, error: message, cachedCopyRetained: !!previousTerm })
          console.warn(`${entry.url}: ${message}${previousTerm ? ' (keeping cached copy)' : ''}`)
        }
        completed++
        if (completed % 20 === 0 || completed === remote.length) console.log(`Processed ${completed}/${remote.length} vocabulary URLs.`)
      }
    }
    // Settle all workers before releasing locks if a programming/filesystem error occurs.
    const workers = await Promise.allSettled(Array.from({ length: concurrency }, worker))
    const rejected = workers.find(result => result.status === 'rejected')
    if (rejected?.status === 'rejected') throw rejected.reason
    terms.sort((a, b) => a.url.localeCompare(b.url))
    failures.sort((a, b) => a.url.localeCompare(b.url))
    const missingDescriptions = terms.filter(term => !term.descriptions.nl?.length || !term.descriptions.en?.length)
      .map(term => ({ url: term.url, missingLanguages: ['nl', 'en'].filter(lang => !term.descriptions[lang as 'nl' | 'en']?.length) }))
    const report = {
      checkedAt: new Date().toISOString(), uniqueUrls: entries.length, externalUrls: remote.length,
      collectionObjectUrls: entries.length - remote.length, fetched, reused, cachedTerms: terms.length,
      descriptions: { nl: terms.filter(term => term.descriptions.nl?.length).length, en: terms.filter(term => term.descriptions.en?.length).length },
      failures, missingDescriptions
    }
    await writeJson(join(output, 'vocabularies.json'), { version: 1, languages: ['nl', 'en'], terms })
    await writeJson(join(cache, 'report.json'), report)
    console.log(`Cached ${terms.length} terms (${fetched} fetched, ${reused} reused). Descriptions: ${report.descriptions.nl} Dutch, ${report.descriptions.en} English. Failures: ${failures.length}.\nOutput: ${output}\nReport: ${join(cache, 'report.json')}`)
    return report
  } finally {
    for (const lock of locks.reverse()) await rm(lock, { recursive: true, force: true })
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: {
      'schemas-dir': { type: 'string' }, 'cache-dir': { type: 'string' }, 'output-dir': { type: 'string' },
      refresh: { type: 'boolean' }, offline: { type: 'boolean' }, concurrency: { type: 'string' },
      help: { type: 'boolean', short: 'h' }
    } })
    if (values.help) {
      console.log('Usage: pnpm fetch:vocabularies [--refresh | --offline] [--schemas-dir PATH] [--cache-dir PATH] [--output-dir PATH] [--concurrency 1..8]\n\nDiscover sameAs URLs and cache Dutch/English labels, aliases, and descriptions. Successful cached responses are reused unless --refresh is set.')
    } else {
      const report = await fetchVocabularies({ schemas: values['schemas-dir'], cache: values['cache-dir'], output: values['output-dir'],
        refresh: values.refresh, offline: values.offline, concurrency: values.concurrency === undefined ? undefined : Number(values.concurrency) })
      if (report.failures.length) process.exitCode = 1
    }
  } catch (error) {
    console.error(`Vocabulary fetch failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
