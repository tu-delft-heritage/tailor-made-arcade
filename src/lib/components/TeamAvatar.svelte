<script lang="ts">
  import type { Teammate } from '$lib/game/team'
  let { character, decorative = false, shocked = false, onready }: {
    character: Teammate; decorative?: boolean; shocked?: boolean; onready?: () => void
  } = $props()
</script>

<img class="team-avatar" src={shocked ? character.shockedPortrait : character.portrait} alt={decorative ? '' : character.name}
  width="256" height="256" draggable="false" onload={onready} onerror={onready} />

<style>
  .team-avatar { display: block; width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; }
</style>
