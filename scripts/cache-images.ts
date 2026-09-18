import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const option = (name: string) => {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}
const outputDir = resolve(root, option('--output-dir') ?? process.env.GAME_IMAGE_DIR ?? '.cache/game-assets')
const refresh = process.argv.includes('--refresh')
const records = JSON.parse(await readFile(join(root, 'data/objects.json'), 'utf8'))
const selection: { id: string }[] = process.argv.includes('--prototype')
  ? JSON.parse(await readFile(join(root, 'data/game-selection.json'), 'utf8')) : records
const objectsDir = join(outputDir, 'objects')
await mkdir(objectsDir, { recursive: true })

const cached = []
for (const item of selection) {
  const record = records.find((candidate: any) => candidate.id === item.id)
  const url = record?.images[0]?.thumbnail
  if (!url) throw new Error(`No thumbnail URL for ${item.id}`)
  const destination = join(objectsDir, `${item.id}.jpg`)
  if (!refresh) {
    try {
      const file = await stat(destination)
      cached.push({ id: item.id, url, bytes: file.size, reused: true })
      continue
    } catch { /* Fetch a missing file. */ }
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
    throw new Error(`Image unavailable: ${url} (${response.status})`)
  }
  const bytes = new Uint8Array(await response.arrayBuffer())
  const temporary = `${destination}.download`
  await writeFile(temporary, bytes)
  await rename(temporary, destination)
  cached.push({ id: item.id, url, bytes: bytes.length, reused: false })
  console.log(`Cached ${item.id} (${Math.ceil(bytes.length / 1024)} KB)`)
}

await writeFile(join(outputDir, 'index.json'), JSON.stringify({
  fetchedAt: new Date().toISOString(), objects: cached
}, null, 2) + '\n')
console.log(`Ready: ${cached.length} images in ${outputDir}`)
