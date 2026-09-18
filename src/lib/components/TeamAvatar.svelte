<script lang="ts">
  import type { Teammate } from '$lib/game/team'
  let { character, decorative = false }: { character: Teammate; decorative?: boolean } = $props()
</script>

<img class="team-avatar" src={character.portrait} alt={decorative ? '' : character.name} width="256" height="256" draggable="false" />

<style>
  .team-avatar { display: block; width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; }
</style>
