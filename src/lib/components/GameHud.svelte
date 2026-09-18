<script lang="ts">
  import type { RoundResult } from '$lib/game/types'
  import type { Teammate } from '$lib/game/team'
  import TeamAvatar from './TeamAvatar.svelte'

  let { character, score, results, questionIndex, total, totalSeconds, question, totalLabel, questionLabel, progressLabel }: {
    character: Teammate
    score: number
    results: RoundResult[]
    questionIndex: number
    total: number
    totalSeconds: number
    question: number
    totalLabel: string
    questionLabel: string
    progressLabel: string
  } = $props()

  const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
</script>

<div class="game-hud">
  <div class="player-badge"><span class="player-portrait" title={character.name}><TeamAvatar {character} /></span><span>{String(score).padStart(4, '0')}</span></div>
  <ol class="round-progress" aria-label={progressLabel}>
    {#each Array(total) as _, index}
      {@const result = results[index]}
      <li class:current={index === questionIndex} class:correct={result === 'correct'}
        class:wrong={result === 'wrong'} class:timeout={result === 'timeout'}
        aria-label={`${questionLabel} ${index + 1}${result ? `: ${result}` : ''}`}>
        {result === 'correct' ? '✓' : result === 'wrong' || result === 'timeout' ? '×' : index + 1}
      </li>
    {/each}
  </ol>
  <div class="timers" aria-live="off">
    <span title={totalLabel} aria-label={`${totalLabel}: ${time(totalSeconds)}`}>{time(totalSeconds)}</span>
    <span class="question-clock" class:urgent={question <= 5} title={questionLabel} aria-label={`${questionLabel}: ${question}`}><span aria-hidden="true">◷</span> {question}s</span>
  </div>
</div>
