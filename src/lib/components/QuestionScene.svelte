<script lang="ts">
  import ObjectPhoto from './ObjectPhoto.svelte'
  import type { GameObject, Language, Question } from '$lib/game/types'
  let { question, language, zoom = 1, imageUrl, revealed = false, onready, onerror }: {
    question: Question; language: Language; zoom?: number; imageUrl: (object: GameObject) => string;
    revealed?: boolean; onready?: (id: string) => void; onerror?: (id: string) => void
  } = $props()
  const photos = $derived(question.photos ?? [question.object])
  const ready = new Set<string>()
  function loaded(id: string) {
    ready.add(id)
    if (photos.every(object => ready.has(object.id))) onready?.(question.id)
  }
</script>

<div class="question-scene" class:multiple={Boolean(question.photos)} class:with-clue={Boolean(question.clue)}>
  <div class="specimens">
    {#each photos as object, index (object.id)}
      <div class="shelf-display" class:correct-specimen={revealed && question.photos && question.answer === 'ABCD'[index]}>
        <ObjectPhoto {object} {language} src={imageUrl(object)} {zoom} onready={() => loaded(object.id)} onerror={() => onerror?.(question.id)} />
        {#if question.photos}<span class="specimen-letter">{'ABCD'[index]}</span>{/if}
        <span class="shelf-ledge" aria-hidden="true"></span>
      </div>
    {/each}
  </div>
  {#if question.clue}<blockquote class="definition-clue">“{question.clue}”</blockquote>{/if}
</div>
