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

/** Move through the visible teammate grid, including a partially filled last row. */
export function moveTeammate(index: number, direction: Direction, columns: number, count: number): number {
  if (count <= 0 || columns <= 0) return index
  if (direction === 'up') return index >= columns ? index - columns : index
  if (direction === 'down') return index + columns < count ? index + columns : index
  if (direction === 'left') return index % columns > 0 ? index - 1 : index
  return index % columns < columns - 1 && index + 1 < count ? index + 1 : index
}

export function descriptionPages(text: string, limit = 210): string[] {
  const pages: string[] = []
  let page = ''
  for (const paragraph of text.trim().split(/\n+/)) {
    let separator = page ? '\n' : ''
    for (const word of paragraph.trim().split(/\s+/)) {
      if (page && page.length + word.length + separator.length > limit) { pages.push(page); page = ''; separator = '' }
      page += separator + word
      separator = ' '
    }
  }
  if (page) pages.push(page)
  return pages.length ? pages : ['']
}
