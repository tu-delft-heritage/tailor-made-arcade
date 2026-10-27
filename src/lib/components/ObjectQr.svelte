<script lang="ts">
  import { objectQr } from '$lib/game/object-qr'
  import { copy } from '$lib/game/i18n'
  import type { Language } from '$lib/game/types'
  let { objectId, language }: { objectId: string; language: Language } = $props()
  const qr = $derived(objectQr(objectId))
</script>

<a class="object-qr" href={qr.url} target="_blank" rel="noopener noreferrer" aria-label={copy[language].viewHeritageObject}>
  <svg viewBox={`0 0 ${qr.size} ${qr.size}`} aria-hidden="true" shape-rendering="crispEdges">
    <rect width={qr.size} height={qr.size} fill="var(--paper)" />
    <path d={qr.path} fill="var(--ink)" />
  </svg>
</a>

<style>
  .object-qr { display: block; width: min(21cqh, 14cqw); align-self: center; justify-self: end; color: var(--ink); text-decoration: none; }
  svg { display: block; width: 100%; height: auto; aspect-ratio: 1; background: var(--paper); box-shadow: 2px 2px #26333e44; }
  .object-qr:focus-visible { outline: 3px solid var(--ink); outline-offset: 4px; }
  @media (max-aspect-ratio: 4/5) {
    .object-qr { width: 32cqw; }
  }
</style>
