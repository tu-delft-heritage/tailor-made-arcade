import { copy } from './i18n.ts'
import type { Scoreboard } from './scoreboard.ts'
import type { CharacterId, Language } from './types.ts'

export type ExportAvatar = { id: CharacterId; name: string; color: string; portrait: string }
export type ScoreExportTarget = 'scoreboard' | 'run' | CharacterId
export type ScoreExportSnapshot = {
  language: Language
  scores: Scoreboard
  run?: { characterId: CharacterId; score: number }
  siteUrl?: string
}
export type ScoreExportCard = {
  kind: 'score' | 'scoreboard'
  caption: string
  rows: (ExportAvatar & { score: number })[]
  filename: string
  alt: string
  siteUrl?: string
}

/** Keep run totals distinct from saved personal bests, including a lost run's zero. */
export function scoreExportCard(target: ScoreExportTarget, snapshot: ScoreExportSnapshot, avatars: readonly ExportAvatar[]): ScoreExportCard {
  const text = copy[snapshot.language]
  if (target === 'scoreboard') {
    const rows = avatars.map(avatar => ({ ...avatar, score: snapshot.scores[avatar.id] }))
      .sort((a, b) => b.score - a.score)
    return { kind: 'scoreboard', caption: text.bestScore, rows, siteUrl: snapshot.siteUrl,
      filename: `tailor-made-arcade-high-scores-${snapshot.language}.png`,
      alt: `Tailor-Made Arcade · ${text.bestScore}. ${rows.map(row => `${row.name}: ${row.score}`).join(', ')}` }
  }
  if (target === 'run' && !snapshot.run) throw new Error('No completed run to export')
  const id = target === 'run' ? snapshot.run!.characterId : target
  const avatar = avatars.find(member => member.id === id)
  if (!avatar) throw new Error('Unknown export avatar')
  const score = target === 'run' ? snapshot.run!.score : snapshot.scores[id]
  const caption = target === 'run' ? text.points : text.bestScore
  return { kind: 'score', caption, rows: [{ ...avatar, score }], siteUrl: snapshot.siteUrl,
    filename: `tailor-made-arcade-${id}-${target === 'run' ? 'score' : 'high-score'}-${score}.png`,
    alt: `Tailor-Made Arcade · ${avatar.name} · ${caption}: ${score}` }
}
