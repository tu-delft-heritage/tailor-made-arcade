<script lang="ts">
  import bossScene from '$lib/assets/story/liselotte-game-over.png'
  import victorySprite from '$lib/assets/story/cormac-victory.png'
  import idleScene from '$lib/assets/story/idle-team.png'
  import PixelSparkles from './PixelSparkles.svelte'

  let { scene, idleAlt = '' }: { scene: 'idle' | 'gameOver' | 'results'; idleAlt?: string } = $props()
</script>

<div class="story-art" class:boss-art={scene === 'gameOver'} class:idle-art={scene === 'idle'}>
  {#if scene === 'idle'}
    <div class="idle-picture">
      <img src={idleScene} alt={idleAlt} draggable="false" />
      <PixelSparkles />
    </div>
  {:else if scene === 'gameOver'}
    <img class="boss-picture" src={bossScene} alt="" draggable="false" />
  {:else}
    <div class="motorcycle-arrival">
      <div class="motorcycle-rig">
        <img src={victorySprite} alt="" draggable="false" />
      </div>
      <span class="exhaust exhaust-one" aria-hidden="true"></span>
      <span class="exhaust exhaust-two" aria-hidden="true"></span>
      <span class="exhaust exhaust-three" aria-hidden="true"></span>
    </div>
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
  .motorcycle-arrival { position: absolute; left: -3%; bottom: 0; width: 68%; height: 82%; animation: arrive 1s steps(12, end) both; }
  .motorcycle-rig { width: 100%; height: 100%; animation: rumble .3s steps(2, end) infinite; }
  .motorcycle-rig img { object-position: bottom; }
  .exhaust { position: absolute; width: 2.5cqw; height: 2cqw; background: #d2c9b565; right: 6%; bottom: 19%; clip-path: polygon(20% 0, 80% 0, 80% 20%, 100% 20%, 100% 80%, 80% 80%, 80% 100%, 20% 100%, 20% 80%, 0 80%, 0 20%, 20% 20%); animation: puff 2.8s steps(8, end) infinite; opacity: 0; }
  .exhaust-two { animation-delay: .9s; }
  .exhaust-three { animation-delay: 1.8s; }
  @keyframes arrive { from { translate: -20cqw 0; opacity: 0; } to { translate: 0 0; opacity: 1; } }
  @keyframes rumble { 50% { translate: 0 -2px; } }
  @keyframes puff { 0% { opacity: 0; scale: .5; } 20% { opacity: .7; } 100% { opacity: 0; translate: 7cqw -3cqh; scale: 2; } }
  @media (max-aspect-ratio: 4/5) {
    .idle-picture { inset: 22cqh 0 auto; aspect-ratio: 16 / 9; }
    .idle-picture img { object-fit: contain; }
    .boss-picture { height: 58%; object-position: 28% center; }
    .boss-art::after { background: linear-gradient(transparent 40%, #101c30 59%); }
    .motorcycle-arrival { width: 100%; height: 48%; left: 0; }
    .exhaust { width: 4cqw; height: 4cqw; }
  }
  @media (prefers-reduced-motion: reduce) { .motorcycle-arrival, .motorcycle-rig, .exhaust { animation: none; } .exhaust { display: none; } }
</style>
