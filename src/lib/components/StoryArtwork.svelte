<script lang="ts">
  import { bossArt } from '$lib/game/boss-art'
  import type { BossScene } from '$lib/game/boss-scenes'
  import idleScene from '$lib/assets/story/idle-team.png'
  import PixelSparkles from './PixelSparkles.svelte'
  import VictoryArtwork from './VictoryArtwork.svelte'
  import type { VictoryScene } from '$lib/game/victory-scenes'

  let { scene, idleAlt = '', victory = 'motorcycle', boss = 'instruments' }: {
    scene: 'idle' | 'gameOver' | 'results'; idleAlt?: string; victory?: VictoryScene; boss?: BossScene
  } = $props()
</script>

<div class="story-art" class:boss-art={scene === 'gameOver'} class:idle-art={scene === 'idle'}>
  {#if scene === 'idle'}
    <div class="idle-picture">
      <img src={idleScene} alt={idleAlt} draggable="false" />
      <PixelSparkles />
    </div>
  {:else if scene === 'gameOver'}
    <img class="boss-picture" data-boss={boss} src={bossArt[boss]} alt="" draggable="false" />
  {:else}
    {#key victory}<VictoryArtwork variant={victory} />{/key}
  {/if}
</div>

<style>
  .story-art { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 1; }
  img { display: block; width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; }
  .idle-art, .boss-art { background: #101c30; }
  .idle-picture { position: absolute; inset: 0; }
  .idle-picture img, .boss-picture { object-fit: cover; }
  .idle-art::after { content: ''; position: absolute; inset: 0; background: linear-gradient(#0a14287a, transparent 25% 70%, #0a1428b0); }
  .boss-art::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent 35%, #101b3033 55%, #101b3077); }
  @media (max-aspect-ratio: 4/5) {
    .idle-picture { inset: 22cqh 0 auto; aspect-ratio: 16 / 9; }
    .idle-picture img { object-fit: contain; }
    .boss-picture { height: 58%; object-position: 28% center; }
    .boss-art::after { background: linear-gradient(transparent 40%, #101c30 59%); }
  }
</style>
