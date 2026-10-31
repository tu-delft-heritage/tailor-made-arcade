import assert from 'node:assert/strict'
import { test } from 'node:test'
import { scoreExportCard, type ExportAvatar, type ScoreExportSnapshot } from '../src/lib/game/score-export-data.ts'
import { parseScoreboard, MAX_SCORE } from '../src/lib/game/scoreboard.ts'
import { characterIds } from '../src/lib/game/types.ts'
import { canShareFile, shareFile } from '../src/lib/game/share-file.ts'

const avatars: ExportAvatar[] = characterIds.map(id => ({ id, name: id, color: '#ffffff', portrait: `/${id}.png` }))
const scores = { ...parseScoreboard(null), charlotte: 9000, daphne: 1500, anna: 1500 }
const snapshot: ScoreExportSnapshot = { scores, language: 'en', run: { characterId: 'charlotte', score: 4200 } }

test('exported run scores stay distinct from stored high scores and retain game-over zero', () => {
  assert.equal(scoreExportCard('run', snapshot, avatars).rows[0].score, 4200)
  assert.equal(scoreExportCard('charlotte', snapshot, avatars).rows[0].score, 9000)
  const lost = scoreExportCard('run', { ...snapshot, run: { characterId: 'charlotte', score: 0 } }, avatars)
  assert.equal(lost.rows[0].score, 0)
  assert.equal(lost.caption, 'POINTS')
  assert.match(lost.filename, /charlotte-score-0\.png$/)
  assert.throws(() => scoreExportCard('run', { language: 'nl', scores }, avatars))
})

test('scoreboard exports include every avatar, rank ties consistently and never mutate the inputs', () => {
  const before = structuredClone({ snapshot, avatars })
  const card = scoreExportCard('scoreboard', snapshot, avatars)
  assert.deepEqual(card.rows.map(row => row.id), characterIds)
  assert.equal(card.rows.length, 10)
  assert.equal(card.rows.at(-1)!.score, 0)
  assert.deepEqual({ snapshot, avatars }, before)
  const ranked = scoreExportCard('scoreboard', { ...snapshot, scores: { ...scores, jill: MAX_SCORE } }, avatars)
  assert.equal(ranked.rows[0].id, 'jill')
  assert.equal(ranked.rows[0].score, MAX_SCORE)
})

test('card captions and accessible summaries use the chosen language and avatar', () => {
  const dutch = scoreExportCard('daphne', { ...snapshot, language: 'nl' }, avatars)
  assert.equal(dutch.caption, 'HIGHSCORE')
  assert.match(dutch.alt, /daphne · HIGHSCORE: 1500/)
  assert.equal(scoreExportCard('daphne', snapshot, avatars).caption, 'HIGH SCORE')
  assert.equal(scoreExportCard('run', { ...snapshot, language: 'nl' }, avatars).caption, 'PUNTEN')
})

test('native sharing is invoked immediately with the ready PNG file', async () => {
  const file = new File(['png'], 'score.png', { type: 'image/png' })
  let called = false
  const result = shareFile(file, {
    canShare: data => data.files?.[0] === file,
    share: async data => {
      called = true
      assert.deepEqual(data.files, [file])
      assert.equal(data.title, 'Tailor-Made Arcade')
      assert.equal(data.text, 'Play Tailor-Made Arcade and put your heritage knowledge to the test!\n\nhttps://tu-delft-heritage.github.io/tailor-made-arcade/')
    }
  }, snapshot)
  assert.equal(called, true, 'Do not wait for rendering after the share gesture')
  assert.equal(await result, 'shared')
})

test('sharing uses the selected language and configured public game URL', async () => {
  const file = new File(['png'], 'score.png', { type: 'image/png' })
  const result = await shareFile(file, {
    canShare: () => true,
    share: async data => {
      assert.deepEqual(data.files, [file])
      assert.equal(data.text, 'Speel Tailor-Made Arcade en test je erfgoedkennis!\n\nhttps://example.com/arcade/')
    }
  }, { language: 'nl', siteUrl: 'https://example.com/arcade/?preview=1#scores' })
  assert.equal(result, 'shared')
})

test('unsupported or blocked sharing falls back; cancellation is not an error', async () => {
  const file = new File(['png'], 'score.png', { type: 'image/png' })
  assert.equal(canShareFile(file, {}), false)
  assert.equal(canShareFile(file, { share: async () => {}, canShare: () => { throw new Error('Blocked') } }), false)
  assert.equal(await shareFile(file, { canShare: () => false, share: async () => assert.fail('Must not open sharing') }, snapshot), 'unavailable')
  assert.equal(await shareFile(file, { canShare: () => true, share: async () => { throw new Error('Denied') } }, snapshot), 'unavailable')
  assert.equal(await shareFile(file, { canShare: () => true, share: async () => { throw Object.assign(new Error('Cancelled'), { name: 'AbortError' }) } }, snapshot), 'cancelled')
})
