<script lang="ts">
  import { team } from '$lib/game/team'
  import type { Scoreboard } from '$lib/game/scoreboard'
  import { FIRST_ROUND_MAX_SCORE } from '$lib/game/scoring'
  import { copy } from '$lib/game/i18n'
  import TeamAvatar from './TeamAvatar.svelte'
  import type { CharacterId, Language } from '$lib/game/types'
  let { scores, language, recordCharacter = null }: { scores: Scoreboard; language: Language; recordCharacter?: CharacterId | null } = $props()
  const rows = $derived([...team].sort((a, b) => scores[b.id] - scores[a.id]))
  const text = $derived(copy[language])
  const scale = $derived(Math.max(FIRST_ROUND_MAX_SCORE, ...Object.values(scores)))
</script>

<div class="score-table-wrap">
  <table class="score-table">
    <caption class="sr-only">{text.scoreboard}</caption>
    <thead><tr><th scope="col">{text.avatar}</th><th scope="col"><span class="sr-only">{text.highScore}</span></th><th scope="col">{text.score}</th></tr></thead>
    <tbody>
      {#each rows as member (member.id)}
        <tr class:new-record={member.id === recordCharacter}>
          <th scope="row"><span class="score-member"><span class="score-avatar"><TeamAvatar character={member} decorative /></span>{member.name}</span></th>
          <td class="bar-cell"><span class="score-track" aria-hidden="true"><span class="score-fill" style:width={`${scores[member.id] / scale * 100}%`} style:background={member.color}></span></span></td>
          <td class="score-number">{#if member.id === recordCharacter}<span class="record-star" aria-hidden="true">★</span><span class="sr-only">{text.newHighScore} </span>{/if}{String(scores[member.id]).padStart(4, '0')}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .score-table-wrap { width: min(82cqw, 140cqh); min-height: 0; max-height: 100%; align-self: start; overflow-y: auto; justify-self: center; padding: 1cqh 2cqw; background: #102033eb; border: 3px solid #82918c; box-shadow: 6px 7px #071426; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; color: #fff1ca; }
  th, td { padding: .6cqh 1cqw; font-size: min(1.15cqw, 1.7cqh); line-height: 1.5; }
  th { text-align: left; font-weight: normal; }
  thead th { color: #a8b6b8; font-size: min(.95cqw, 1.4cqh); padding-block: 1.5cqh; border-bottom: 2px solid #465769; }
  th:first-child { width: 32%; }
  th:last-child { width: 18%; text-align: right; }
  tbody tr + tr { border-top: 1px solid #3d50604d; }
  .score-member { display: flex; align-items: center; gap: 1cqw; }
  .score-avatar { display: block; flex: 0 0 3.8cqh; width: 3.8cqh; height: 3.8cqh; }
  .score-number { text-align: right; color: #f4d078; white-space: nowrap; }
  .record-star { margin-right: .5em; }
  .new-record { background: #e8bc5124; outline: 2px solid #e8bc51; outline-offset: -2px; animation: record-arrival .7s steps(4, end) both; }
  @keyframes record-arrival { from { background: #e8bc5166; } to { background: #e8bc5124; } }
  .score-track { display: block; width: 100%; height: 2.2cqh; background: #203447; box-shadow: inset 0 2px #071727; }
  .score-fill { display: block; height: 100%; box-shadow: inset 0 -3px #1124364d; }
  @media (max-aspect-ratio: 4/5) {
    .score-table-wrap { width: 94cqw; padding: 1cqh 1cqw; }
    th, td { font-size: 2.1cqw; padding: .6cqh 1cqw; }
    thead th { font-size: 1.9cqw; }
    th:first-child { width: 42%; } th:last-child { width: 20%; }
    .score-member { gap: 2cqw; } .score-avatar { flex-basis: 7cqw; width: 7cqw; height: 7cqw; }
  }
</style>
