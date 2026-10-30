import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import { objectQr } from '../src/lib/game/object-qr.ts'
import { qrCode } from '../src/lib/game/qr.ts'
import { siteHomeUrl } from '../src/lib/game/site-url.ts'
const jsQR: typeof import('jsqr').default = createRequire(import.meta.url)('jsqr')

test('object and website SVG QR modules decode to their exact URLs on cream paper', () => {
  const cases = ['009d29e8-e196-451f-8422-265b6ff27fb1', 'c943823c-15d8-4983-95b7-f561b7ea07da', 'ec078729-f33f-4166-be14-1ab7c0a7da4d']
    .map(id => ({ qr: objectQr(id), expected: `https://heritage.tudelft.nl/objects/${id}` }))
  for (const url of ['https://example.com/', 'https://example.com/tailor-made-arcade/']) {
    cases.push({ qr: qrCode(siteHomeUrl(url)!), expected: url })
  }
  for (const { qr, expected } of cases) {
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
    assert.equal(jsQR(pixels, width, width)?.data, expected)
    assert.equal(qr.url, expected)
  }
})

test('homepage configuration is optional and keeps the deployment subdirectory', () => {
  for (const missing of [undefined, '', '  \t ']) assert.equal(siteHomeUrl(missing), undefined)
  assert.equal(siteHomeUrl(' https://example.com/tailor-made-arcade?preview=1#start '), 'https://example.com/tailor-made-arcade/')
  for (const invalid of ['/relative', 'mailto:library@tudelft.nl', 'javascript:alert(1)']) assert.throws(() => siteHomeUrl(invalid))
})
