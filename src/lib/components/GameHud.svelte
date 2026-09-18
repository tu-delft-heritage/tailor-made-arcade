<script lang="ts">
  import type { RoundResult } from '$lib/game/types'

  let { results, questionIndex, total, totalSeconds, question, totalLabel, questionLabel, progressLabel }: {
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
    <span><small>{totalLabel}</small>{time(totalSeconds)}</span>
    <span class:urgent={question <= 5}><small>{questionLabel}</small>{time(question)}</span>
  </div>
</div>
