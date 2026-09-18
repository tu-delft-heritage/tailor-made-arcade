<script lang="ts">
  import type { GameObject, Language } from '$lib/game/types'

  let { object, language, src, zoom = 1, onready, onerror }: {
    object: GameObject; language: Language; src: string; zoom?: number; onready?: () => void; onerror?: () => void
  } = $props()
</script>

<figure class="object-photo">
  <img {src} alt={object.imageAlt[language] ?? ''}
    style:transform={`scale(${zoom})`} onload={onready} {onerror} fetchpriority="high" />
  {#if zoom > 1}<span class="zoom-level">{zoom.toFixed(2)}×</span>{/if}
</figure>
