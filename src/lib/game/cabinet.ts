// I-PAC2 mapping shared with Allmaps Arcade's CabinetEnvironment.
export const cabinetKeys = {
  toggle: 'KeyZ', zoomOut: 'KeyX', zoomIn: 'KeyC', submit: 'KeyV'
} as const

export type Direction = 'up' | 'down' | 'left' | 'right'

export function joystickDirection(code: string): Direction | undefined {
  const directions: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }
  return directions[code]
}

/** Spatial movement in the cabinet's fixed 2×2 answer grid. Edges do not wrap. */
export function moveSelection(index: number, direction: Direction): number {
  if (direction === 'up') return index >= 2 ? index - 2 : index
  if (direction === 'down') return index < 2 ? index + 2 : index
  if (direction === 'left') return index % 2 === 1 ? index - 1 : index
  return index % 2 === 0 ? index + 1 : index
}

export function descriptionPages(text: string, limit = 210): string[] {
  const pages: string[] = []
  let page = ''
  for (const word of text.trim().split(/\s+/)) {
    if (page && page.length + word.length + 1 > limit) { pages.push(page); page = '' }
    page += (page ? ' ' : '') + word
  }
  if (page) pages.push(page)
  return pages.length ? pages : ['']
}
