<script lang="ts">
  import ObjectPhoto from './ObjectPhoto.svelte'
  import DimensionDiagram from './DimensionDiagram.svelte'
  import Countdown from './Countdown.svelte'
  import { copy } from '$lib/game/i18n'
  import type { DimensionAxis } from '$lib/game/dimensions'
  import type { GameObject, Language, Question } from '$lib/game/types'
  let { question, language, zoom = 1, imageUrl, revealed = false, countdownRemaining = null, countdownLabel = '', onready, onerror }: {
    question: Question; language: Language; zoom?: number; imageUrl: (object: GameObject) => string;
    revealed?: boolean; countdownRemaining?: number | null; countdownLabel?: string; onready?: (id: string) => void; onerror?: (id: string) => void
  } = $props()
  const photos = $derived(question.photos ?? [question.object])
  const hasDimensions = $derived(Boolean(question.dimensions && Object.keys(question.dimensions).length >= 2))
  const rolling = $derived(countdownRemaining !== null && countdownRemaining > 0 && countdownRemaining <= 5000)
  const rolled = $derived(rolling ? 1 - countdownRemaining! / 5000 : 0)
  const ready = new Set<string>()
  function loaded(id: string) {
    ready.add(id)
    if (photos.every(object => ready.has(object.id))) onready?.(question.id)
  }
</script>

<div class="question-scene" class:multiple={Boolean(question.photos)} class:with-clue={Boolean(question.clue)} class:with-dimensions={hasDimensions}>
  <div class="specimens">
    {#each photos as object, index (object.id)}
      <div class="shelf-display" class:rolling style={`--screen-rolled:${rolled}`} class:correct-specimen={revealed && question.photos && question.answer === 'ABCD'[index]}>
        <div class="photo-sheet"><ObjectPhoto {object} {language} src={imageUrl(object)} {zoom} onready={() => loaded(object.id)} onerror={() => onerror?.(question.id)} /></div>
        {#if rolling && index === 0}<Countdown seconds={Math.ceil(countdownRemaining! / 1000)} label={countdownLabel} announcement={copy[language].countdown} />{/if}
        {#if question.photos}<span class="specimen-letter">{'ABCD'[index]}</span>{/if}
        <span class="shelf-ledge" aria-hidden="true"></span>
      </div>
    {/each}
  </div>
  {#if question.clue}<blockquote class="definition-clue">“{question.clue}”</blockquote>{/if}
  {#if hasDimensions && question.dimensions}<DimensionDiagram dimensions={question.dimensions} asked={question.kind as DimensionAxis} {language} {revealed} />{/if}
</div>
