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
  const cupColors = ['#f4d078', '#c5d7e4', '#d69b72']
</script>

<div class="score-table-wrap">
  <table class="score-table">
    <caption class="sr-only">{text.scoreboard}</caption>
    <thead><tr><th class="rank-header" scope="col"><span class="sr-only">{text.place}</span></th><th class="avatar-header" scope="col">{text.avatar}</th><th scope="col"><span class="sr-only">{text.bestScore}</span></th><th scope="col">{text.bestScore}</th></tr></thead>
    {#each [rows.slice(0, 3), rows.slice(3)] as group, groupIndex}
      <tbody class:other-scores={groupIndex === 1}>
        {#each group as member, index (member.id)}
          {@const rank = groupIndex === 0 ? index + 1 : index + 4}
          <tr class:podium-row={rank <= 3} class:new-record={member.id === recordCharacter} style:--cup-color={cupColors[rank - 1]}>
            <td class="score-rank">
              {#if rank <= 3}
                <span class="sr-only">{rank}</span>
                <svg class="score-cup" viewBox="0 0 20 20" aria-hidden="true" shape-rendering="crispEdges">
                  <path fill="currentColor" d="M0 3h5v2H2v3h3v2H2V8H0zm15 0h5v5h-2v2h-3V8h3V5h-3zM4 1h12v7h-2v3h-3v4h4v2h2v2H3v-2h2v-2h4v-4H6V8H4z" />
                  <path fill="#fff" opacity=".45" d="M6 3h2v4H6zM5 17h4v1H5z" />
                  <path fill="#101c30" opacity=".25" d="M12 3h2v5h-2v2h-2V8h2zM11 17h4v1h-4z" />
                </svg>
              {:else}{rank}{/if}
            </td>
            <th scope="row"><span class="score-member"><span class="score-avatar"><TeamAvatar character={member} decorative /></span>{member.name}</span></th>
            <td class="bar-cell"><span class="score-track" aria-hidden="true"><span class="score-fill" style:width={`${scores[member.id] / scale * 100}%`} style:background={member.color}></span></span></td>
            <td class="score-number">{#if member.id === recordCharacter}<span class="record-star" aria-hidden="true">★</span><span class="sr-only">{text.newHighScore} </span>{/if}{String(scores[member.id]).padStart(4, '0')}</td>
          </tr>
        {/each}
      </tbody>
    {/each}
  </table>
</div>

<style>
  .score-table-wrap { width: min(82cqw, 140cqh); min-height: 0; max-height: 100%; align-self: start; overflow-y: auto; justify-self: center; padding: 1cqh 2cqw; background: #102033eb; border: 3px solid #82918c; box-shadow: 6px 7px #071426; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; color: #fff1ca; }
  th, td { padding: .6cqh 1cqw; font-size: min(1.15cqw, 1.7cqh); line-height: 1.5; }
  th { text-align: left; font-weight: normal; }
  thead th { color: #a8b6b8; font-size: min(.95cqw, 1.4cqh); padding-block: 1.5cqh; border-bottom: 2px solid #465769; }
  .rank-header { width: 6%; }
  .avatar-header { width: 34%; }
  thead th:last-child { width: 18%; text-align: right; }
  tbody tr + tr { border-top: 1px solid #3d50604d; }
  .podium-row { background: color-mix(in srgb, var(--cup-color) 11%, transparent); box-shadow: inset 3px 0 var(--cup-color); }
  .podium-row .score-member, .podium-row .score-number { color: var(--cup-color); }
  .other-scores { border-top: 1.8cqh solid #102033; }
  .score-rank { padding-inline: .3cqw; color: #91a5b4; text-align: center; }
  .score-cup { display: block; width: min(2.3cqw, 3.4cqh); height: min(2.3cqw, 3.4cqh); margin-inline: auto; color: var(--cup-color); filter: drop-shadow(2px 2px #071426); }
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
    .rank-header { width: 8%; } .avatar-header { width: 44%; } thead th:last-child { width: 22%; }
    .score-cup { width: 4.5cqw; height: 4.5cqw; }
    .score-member { gap: 2cqw; } .score-avatar { flex-basis: 7cqw; width: 7cqw; height: 7cqw; }
  }
</style>
