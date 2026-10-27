import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import { objectQr } from '../src/lib/game/object-qr.ts'
const jsQR: typeof import('jsqr').default = createRequire(import.meta.url)('jsqr')

test('the SVG QR modules decode to the exact object permalink on cream paper', () => {
  for (const id of ['009d29e8-e196-451f-8422-265b6ff27fb1', 'c943823c-15d8-4983-95b7-f561b7ea07da', 'ec078729-f33f-4166-be14-1ab7c0a7da4d']) {
    const qr = objectQr(id)
    const scale = 4, width = qr.size * scale
    const pixels = new Uint8ClampedArray(width * width * 4)
    for (let pixel = 0; pixel < pixels.length; pixel += 4) pixels.set([238, 224, 184, 255], pixel)
    // Rasterize the emitted square SVG commands, then use an independent decoder.
    for (const match of qr.path.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
      const x = Number(match[1]), y = Number(match[2])
      assert.ok(x >= 4 && x < qr.size - 4 && y >= 4 && y < qr.size - 4, 'four-module quiet zone stays clear')
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        pixels.set([41, 48, 57, 255], ((y * scale + dy) * width + x * scale + dx) * 4)
      }
    }
    assert.equal(jsQR(pixels, width, width)?.data, `https://heritage.tudelft.nl/objects/${id}`)
    assert.equal(qr.url, `https://heritage.tudelft.nl/objects/${id}`)
  }
})
