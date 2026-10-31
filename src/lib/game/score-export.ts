import { FIRST_ROUND_MAX_SCORE } from './scoring'
import type { ScoreExportCard } from './score-export-data'

const WIDTH = 540, HEIGHT = 675, SCALE = 2
const palette = { navy: '#0a111e', panel: '#142b3d', paper: '#eee0b8', ink: '#293039', gold: '#edc35b', muted: '#a5b6bb' }

function loadPortrait(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const timer = setTimeout(() => { image.onload = image.onerror = null; reject(new Error('Avatar load timed out')) }, 10_000)
    image.onload = () => { clearTimeout(timer); resolve(image) }
    image.onerror = () => { clearTimeout(timer); reject(new Error('Avatar unavailable')) }
    image.src = src
  })
}

async function loadFont() {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const fonts = await Promise.race([
      document.fonts.load('16px "Press Start 2P"'),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Font load timed out')), 10_000) })
    ])
    if (!fonts.length) throw new Error('Arcade font unavailable')
  } finally { clearTimeout(timer) }
}

/** Draw only bundled, same-origin artwork; remote collection photos never enter the canvas. */
export async function renderScoreExport(card: ScoreExportCard): Promise<File> {
  const [, portraits] = await Promise.all([loadFont(), Promise.all(card.rows.map(row => loadPortrait(row.portrait)))])
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH * SCALE
  canvas.height = HEIGHT * SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.scale(SCALE, SCALE)
  ctx.imageSmoothingEnabled = false

  function text(value: string, x: number, y: number, size: number, color: string, maxWidth: number, align: CanvasTextAlign = 'center') {
    ctx!.textAlign = align
    ctx!.textBaseline = 'top'
    do { ctx!.font = `${size}px "Press Start 2P"`; size -= 1 } while (ctx!.measureText(value).width > maxWidth && size > 5)
    ctx!.fillStyle = color
    ctx!.fillText(value, x, y)
  }
  function tag(x: number, y: number, width: number, height: number) {
    const cut = 16
    ctx!.fillStyle = palette.paper
    ctx!.beginPath()
    ctx!.moveTo(x, y); ctx!.lineTo(x + width - cut, y); ctx!.lineTo(x + width, y + cut)
    ctx!.lineTo(x + width, y + height - cut); ctx!.lineTo(x + width - cut, y + height)
    ctx!.lineTo(x, y + height); ctx!.closePath(); ctx!.fill()
  }
  function cup(x: number, y: number, color: string) {
    ctx!.save(); ctx!.translate(x, y); ctx!.scale(1.3, 1.3)
    ctx!.fillStyle = color
    ctx!.fill(new Path2D('M0 3h5v2H2v3h3v2H2V8H0zm15 0h5v5h-2v2h-3V8h3V5h-3zM4 1h12v7h-2v3h-3v4h4v2h2v2H3v-2h2v-2h4v-4H6V8H4z'))
    ctx!.restore()
  }

  ctx.fillStyle = palette.navy; ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.strokeStyle = palette.gold; ctx.lineWidth = 4; ctx.strokeRect(12, 12, WIDTH - 24, HEIGHT - 24)
  // Sparse pixel shelving gives the cards the same depot setting as the game.
  ctx.fillStyle = '#182b3b'
  for (const x of [30, 498]) ctx.fillRect(x, 24, 12, HEIGHT - 48)
  for (const y of [168, 400, 610]) ctx.fillRect(24, y, WIDTH - 48, 6)
  text('TAILOR-MADE', WIDTH / 2 + 3, 35, 28, '#393744', 460)
  text('TAILOR-MADE', WIDTH / 2, 32, 28, palette.paper, 460)
  text('ARCADE', WIDTH / 2 + 4, 83, 48, '#5f4634', 460)
  text('ARCADE', WIDTH / 2, 79, 48, palette.gold, 460)

  if (card.kind === 'score') {
    const row = card.rows[0]
    ctx.fillStyle = row.color; ctx.fillRect(150, 171, 240, 240)
    ctx.fillStyle = palette.navy; ctx.fillRect(154, 175, 232, 232)
    ctx.drawImage(portraits[0], 158, 179, 224, 224)
    tag(60, 432, 420, 164)
    text(row.name.toUpperCase(), WIDTH / 2, 450, 24, palette.ink, 372)
    text(String(row.score).padStart(4, '0'), WIDTH / 2, 490, 56, palette.ink, 360)
    text(card.caption, WIDTH / 2, 566, 12, palette.ink, 360)
  } else {
    tag(140, 143, 260, 32)
    text(card.caption, WIDTH / 2, 153, 12, palette.ink, 222)
    const max = Math.max(FIRST_ROUND_MAX_SCORE, ...card.rows.map(row => row.score))
    const cups = ['#f4d078', '#c5d7e4', '#d69b72']
    card.rows.forEach((row, index) => {
      const y = 191 + index * 41 + (index >= 3 ? 12 : 0)
      ctx.fillStyle = index < 3 ? '#253342' : palette.panel
      ctx.fillRect(42, y, 456, 37)
      if (index < 3) {
        ctx.fillStyle = cups[index]; ctx.fillRect(42, y, 3, 37)
        cup(50, y + 5, cups[index])
      } else text(String(index + 1), 64, y + 14, 11, palette.muted, 28)
      ctx.drawImage(portraits[index], 86, y + 2, 33, 33)
      text(row.name.toUpperCase(), 130, y + 5, 12, index < 3 ? cups[index] : palette.paper, 200, 'left')
      ctx.fillStyle = '#0c1a28'; ctx.fillRect(130, y + 24, 182, 6)
      ctx.fillStyle = row.color; ctx.fillRect(130, y + 24, Math.round(row.score / max * 182), 6)
      text(String(row.score).padStart(4, '0'), 485, y + 13, 15, index < 3 ? cups[index] : palette.gold, 153, 'right')
    })
  }
  const footer = card.siteUrl ? card.siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'TU DELFT HERITAGE'
  text(footer, WIDTH / 2, 640, 9, palette.muted, 450)
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG export failed')), 'image/png'))
  return new File([blob], card.filename, { type: 'image/png' })
}
