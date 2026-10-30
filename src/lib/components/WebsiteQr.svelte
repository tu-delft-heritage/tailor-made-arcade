<script lang="ts">
  import { qrCode } from '$lib/game/qr'
  import { copy } from '$lib/game/i18n'
  import type { Language } from '$lib/game/types'

  let { url, language }: { url: string; language: Language } = $props()
  const qr = $derived(qrCode(url))
</script>

<a class="website-qr" href={url} target="_blank" rel="noopener noreferrer" aria-label={copy[language].viewLiveSite}>
  <svg viewBox={`0 0 ${qr.size} ${qr.size}`} aria-hidden="true" shape-rendering="crispEdges">
    <rect width={qr.size} height={qr.size} fill="var(--paper)" />
    <path d={qr.path} fill="var(--ink)" />
  </svg>
  <span>{copy[language].playOnline}</span>
</a>

<style>
  .website-qr { position: absolute; right: 4cqw; bottom: 5cqh; display: flex; flex-direction: column; align-items: center; gap: 1cqh; width: min(22cqh, 18cqw); padding: 1cqh; color: var(--ink); background: var(--paper); box-shadow: 4px 5px #091623; text-decoration: none; }
  svg { display: block; width: 100%; aspect-ratio: 1; }
  span { font-size: min(1cqw, 1.4cqh); line-height: 1.8; text-align: center; }
  .website-qr:hover { color: var(--ink); text-decoration: none; }
  .website-qr:focus-visible { outline: 3px solid var(--gold); outline-offset: 4px; }
  @media (max-aspect-ratio: 4/5) {
    .website-qr { right: 4cqw; width: 26cqw; padding: 1cqw; }
    span { font-size: 2cqw; }
  }
</style>
