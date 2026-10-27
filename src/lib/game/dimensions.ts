import type { GameData, GameObject, Language } from './types.ts'

export const dimensionAxes = ['height', 'width', 'depth'] as const
export type DimensionAxis = typeof dimensionAxes[number]
export type Measurement = { millimetres: number; label: string }
export type Dimensions = Partial<Record<DimensionAxis, Measurement>>
type Point = [number, number]

export function parseMeasurement(label: string): Measurement | undefined {
  const match = label.trim().match(/^(\d+(?:[.,]\d+)?)\s*(mm|cm|m)$/i)
  if (!match) return
  const millimetres = Number(match[1].replace(',', '.')) * ({ mm: 1, cm: 10, m: 1000 }[match[2].toLowerCase()] ?? 0)
  if (!Number.isFinite(millimetres) || millimetres <= 0) return
  return { millimetres, label }
}

export function objectDimensions(object: GameObject, entities: GameData['entities'], language: Language): Dimensions {
  const dimensions: Dimensions = {}
  for (const axis of dimensionAxes) {
    const ids = object.facts[axis]
    if (ids?.length !== 1) continue
    const label = entities[ids[0]]?.labels[language]
    const measurement = label ? parseMeasurement(label) : undefined
    if (measurement) dimensions[axis] = measurement
  }
  return dimensions
}

/** One shared scale preserves the measured proportions, including very thin objects. */
export function dimensionGeometry(dimensions: Dimensions) {
  const axes = dimensionAxes.filter(axis => dimensions[axis])
  if (axes.length < 2) return null
  const value = (axis: DimensionAxis) => dimensions[axis]!.millimetres
  const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]]
  const origin: Point = [0, 0]
  let faces: Point[][]
  let edges: { axis: DimensionAxis; from: Point; to: Point }[]
  if (axes.length === 3) {
    const w: Point = [value('width') * Math.sqrt(3) / 2, value('width') / 2]
    const d: Point = [value('depth') * Math.sqrt(3) / 2, -value('depth') / 2]
    const h: Point = [0, -value('height')]
    faces = [[origin, w, add(w, h), h], [w, add(w, d), add(add(w, d), h), add(w, h)], [h, add(w, h), add(add(w, h), d), add(h, d)]]
    edges = [{ axis: 'height', from: origin, to: h }, { axis: 'width', from: origin, to: w }, { axis: 'depth', from: w, to: add(w, d) }]
  } else {
    const horizontal = axes.includes('width') ? 'width' : 'depth'
    const vertical = axes.find(axis => axis !== horizontal)!
    const w: Point = [value(horizontal), 0], h: Point = [0, -value(vertical)]
    faces = [[origin, w, add(w, h), h]]
    edges = [{ axis: horizontal, from: origin, to: w }, { axis: vertical, from: origin, to: h }]
  }
  const points = faces.flat()
  const minX = Math.min(...points.map(p => p[0])), maxX = Math.max(...points.map(p => p[0]))
  const minY = Math.min(...points.map(p => p[1])), maxY = Math.max(...points.map(p => p[1]))
  const scale = Math.min(240 / (maxX - minX), 140 / (maxY - minY))
  const transform = ([x, y]: Point): Point => [150 + (x - (minX + maxX) / 2) * scale, 88 + (y - (minY + maxY) / 2) * scale]
  return { flat: axes.length === 2, faces: faces.map(face => face.map(transform)), edges: edges.map(edge => ({ ...edge, from: transform(edge.from), to: transform(edge.to) })) }
}
