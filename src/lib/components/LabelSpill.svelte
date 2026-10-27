<!-- Mounted once per mission: animation endpoints remain on the depot floor. -->
<div class="label-spill" aria-hidden="true">
  {#each Array(22) as _, i}
    {@const x = 4 + (i * 37 % 88)}
    {@const floor = 70 + (i * 13 % 26)}
    <span class="floor-label" style={`--x:${x}%;--floor:${floor}%;--start-x:${50 - x}cqw;--start-y:${48 - floor}cqh;--delay:${250 + i % 7 * 80}ms;--turn:${(i * 41) % 100 - 50}deg;--paper:${i % 3 ? '#e8d9af' : '#dab65d'};--size:${2.7 + i % 4 * .55}cqw`}>
      <i></i><b></b>
    </span>
  {/each}
</div>

<style>
  .label-spill { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 2; }
  .floor-label { position: absolute; left: var(--x); top: var(--floor); width: max(22px, var(--size)); aspect-ratio: 1.8; background: var(--paper); clip-path: polygon(0 0, 80% 0, 100% 30%, 100% 70%, 80% 100%, 0 100%); transform: rotate(var(--turn)) scaleY(.65); animation: land 2.5s var(--delay) both; filter: drop-shadow(2px 3px #111a2488); }
  i { position: absolute; width: 7%; height: 14%; background: #333a44; right: 10%; top: 43%; }
  b { position: absolute; width: 42%; height: 7%; left: 12%; top: 34%; background: #8b7b5c; box-shadow: 0 4px #8b7b5c; }
  @keyframes land {
    0% { opacity: 0; transform: translate(var(--start-x), var(--start-y)) rotate(-65deg) scale(.6); }
    8% { opacity: 1; }
    72% { transform: translate(-1cqw, -3cqh) rotate(calc(var(--turn) - 18deg)); }
    84% { transform: translateY(0) rotate(var(--turn)) scaleY(.65); }
    92% { transform: translateY(-1cqh) rotate(calc(var(--turn) + 5deg)) scaleY(.75); }
    100% { transform: translateY(0) rotate(var(--turn)) scaleY(.65); }
  }
  @media (prefers-reduced-motion: reduce) { .floor-label { animation: none; } }
</style>
