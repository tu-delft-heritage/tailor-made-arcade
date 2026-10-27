<script lang="ts">
  const glints = [[11, 78], [24, 79], [34, 72], [47, 64], [54, 74], [64, 57], [75, 69], [82, 84]]
</script>

<div class="pixel-sparkles" aria-hidden="true">
  {#each glints as [x, y], index}
    <i style={`--x:${x}%;--y:${y}%;--delay:${index * -.7}s;--duration:${3.2 + index % 3 * .6}s`}></i>
  {/each}
</div>

<style>
  .pixel-sparkles { position: absolute; inset: 0; pointer-events: none; }
  i { position: absolute; left: var(--x); top: var(--y); width: max(9px, 1.4cqw); aspect-ratio: 1; background: #fff3c3;
    clip-path: polygon(40% 0, 60% 0, 60% 30%, 70% 40%, 100% 40%, 100% 60%, 70% 60%, 60% 70%, 60% 100%, 40% 100%, 40% 70%, 30% 60%, 0 60%, 0 40%, 30% 40%, 40% 30%);
    opacity: .7; animation: sparkle var(--duration) var(--delay) steps(4, end) infinite; }
  @keyframes sparkle { 0%, 65%, 100% { opacity: 0; scale: .3; } 76% { opacity: 1; scale: 1.3; } 88% { opacity: .6; scale: .7; } }
  @media (prefers-reduced-motion: reduce) { i { animation: none; opacity: .65; } }
</style>
