import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dimensionGeometry, objectDimensions, parseMeasurement, type Dimensions } from '../src/lib/game/dimensions.ts'
import type { GameObject } from '../src/lib/game/types.ts'

const measurement = (millimetres: number) => ({ millimetres, label: `${millimetres} mm` })
const length = (edge: { from: number[]; to: number[] }) => Math.hypot(edge.to[0] - edge.from[0], edge.to[1] - edge.from[1])
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`)

test('measurements normalize units and reject missing, zero or ambiguous values', () => {
  assert.equal(parseMeasurement('1,5 cm')?.millimetres, 15)
  assert.equal(parseMeasurement('0.3 m')?.millimetres, 300)
  for (const invalid of ['0 mm', '-20 mm', '20', '10–20 mm', 'about 20 mm', 'unknown']) assert.equal(parseMeasurement(invalid), undefined)
  const dimensions = objectDimensions({ facts: { height: ['h'], width: ['w'], depth: ['d', 'd2'] } } as GameObject,
    { h: { id: 'h', aliases: [], labels: { nl: '2 cm' } }, w: { id: 'w', aliases: [], labels: { nl: '40 mm' } } }, 'nl')
  assert.deepEqual(dimensions, { height: { millimetres: 20, label: '2 cm' }, width: measurement(40) })
})

test('cuboid axes retain the true ratios under one common scale', () => {
  const geometry = dimensionGeometry({ height: measurement(100), width: measurement(200), depth: measurement(50) })!
  assert.equal(geometry.flat, false)
  assert.equal(geometry.faces.length, 3)
  const lengths = Object.fromEntries(geometry.edges.map(edge => [edge.axis, length(edge)]))
  close(lengths.width / lengths.height, 2)
  close(lengths.depth / lengths.height, .5)
  assert.ok(geometry.faces.flat().every(([x, y]) => x >= 0 && x <= 300 && y >= 0 && y <= 180))
})

test('any two known axes form a true flat rectangle; fewer than two draw nothing', () => {
  const cases: Dimensions[] = [
    { height: measurement(20), width: measurement(40) },
    { width: measurement(20), depth: measurement(40) },
    { height: measurement(20), depth: measurement(40) }
  ]
  for (const dimensions of cases) {
    const geometry = dimensionGeometry(dimensions)!
    assert.equal(geometry.flat, true)
    assert.equal(geometry.faces.length, 1)
    assert.equal(geometry.edges.length, 2)
    const [a, b] = geometry.edges
    close(length(a) / length(b), dimensions[a.axis]!.millimetres / dimensions[b.axis]!.millimetres)
  }
  assert.equal(dimensionGeometry({}), null)
  assert.equal(dimensionGeometry({ height: measurement(20) }), null)
})
