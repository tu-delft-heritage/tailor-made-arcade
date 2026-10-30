<script lang="ts">
  import { victoryArt } from '$lib/game/victory-art'
  import type { VictoryScene } from '$lib/game/victory-scenes'

  let { variant = 'motorcycle' }: { variant?: VictoryScene } = $props()
  let ready = $state(false)
</script>

<div class="victory-art" data-vehicle={variant} class:ready aria-hidden="true">
  {#if variant === 'ejection-seat'}
    <div class="launch-pad"></div>
    <div class="launch-smoke smoke-one"></div>
    <div class="launch-smoke smoke-two"></div>
    <div class="launch-smoke smoke-three"></div>
  {/if}
  <div class="vehicle-arrival">
    <div class="vehicle-rig">
      <img src={victoryArt[variant]} alt="" draggable="false" onload={() => ready = true} />
      {#if variant === 'ejection-seat'}<span class="launch-flame"></span>{/if}
    </div>
    {#if variant === 'motorcycle'}
      <span class="exhaust exhaust-one"></span>
      <span class="exhaust exhaust-two"></span>
      <span class="exhaust exhaust-three"></span>
    {:else if variant === 'mars-rover'}
      <span class="rover-dust dust-one"></span>
      <span class="rover-dust dust-two"></span>
    {/if}
  </div>
</div>

<style>
  .victory-art { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .vehicle-arrival { position: absolute; left: -3%; bottom: 0; width: 68%; height: 82%; }
  .vehicle-rig { position: relative; width: 100%; height: 100%; }
  img { display: block; width: 100%; height: 100%; object-fit: contain; object-position: bottom; image-rendering: pixelated; }
  .ready .vehicle-arrival { animation: arrive 1s steps(12, end) both; }
  .ready[data-vehicle='motorcycle'] .vehicle-rig { animation: rumble .3s steps(2, end) infinite; }
  .exhaust, .rover-dust, .launch-smoke { position: absolute; opacity: 0; clip-path: polygon(20% 0, 80% 0, 80% 20%, 100% 20%, 100% 80%, 80% 80%, 80% 100%, 20% 100%, 20% 80%, 0 80%, 0 20%, 20% 20%); }
  .exhaust { width: 2.5cqw; height: 2cqw; background: #d2c9b565; right: 6%; bottom: 19%; }
  .ready .exhaust { animation: puff 2.8s steps(8, end) infinite; }
  .ready .exhaust-two { animation-delay: .9s; }
  .ready .exhaust-three { animation-delay: 1.8s; }

  [data-vehicle='ejection-seat'] .vehicle-arrival { left: 8%; bottom: 3%; width: 46%; height: 76%; }
  [data-vehicle='ejection-seat'] img { position: relative; z-index: 1; }
  .ready[data-vehicle='ejection-seat'] .vehicle-arrival { animation: seat-arrive .7s steps(10, end) both; }
  .ready[data-vehicle='ejection-seat'] .vehicle-rig { animation: eject 5.9s steps(32, end) .7s both; }
  .launch-pad { position: absolute; left: 18%; bottom: 2%; width: 26%; height: 2%; background: #777e83; border-top: .5cqh solid #b2b8ab; box-shadow: 0 .5cqh #162130; }
  .launch-flame { position: absolute; top: 94%; left: 45%; width: 18%; height: 28%; background: #fff3a3; box-shadow: inset 1cqw 0 #f38b39, inset -1cqw 0 #f38b39; clip-path: polygon(0 0, 100% 0, 100% 40%, 80% 40%, 80% 72%, 60% 72%, 60% 100%, 40% 100%, 40% 66%, 20% 66%, 20% 35%, 0 35%); opacity: 0; transform-origin: top; }
  .ready .launch-flame { animation: ignition 5.9s steps(12, end) .7s both; }
  .launch-smoke { left: 28%; bottom: 3%; width: 7cqw; height: 5cqh; background: #e6d4ad99; --smoke-x: -9cqw; }
  .smoke-two { --smoke-x: 10cqw; }
  .smoke-three { --smoke-x: 1cqw; }
  .ready .launch-smoke { animation: launch-cloud 1.6s steps(12, end) 3s both; }
  .ready .smoke-two { animation-delay: 3.12s; }
  .ready .smoke-three { animation-delay: 3.24s; }

  [data-vehicle='mars-rover'] .vehicle-arrival { left: 0; width: 59%; height: 76%; bottom: 2%; }
  .ready[data-vehicle='mars-rover'] .vehicle-rig { animation: rover-bounce 1.8s steps(6, end) infinite; transform-origin: 50% 90%; }
  .rover-dust { right: 3%; bottom: 7%; width: 3cqw; height: 1.8cqw; background: #d9c28b70; }
  .ready .rover-dust { animation: puff 2.4s steps(8, end) infinite; }
  .ready .dust-two { animation-delay: 1.2s; }

  [data-vehicle='aircraft'] .vehicle-arrival { left: 1%; width: 59%; height: 74%; bottom: 2%; }
  .ready[data-vehicle='aircraft'] .vehicle-rig { animation: aircraft-wobble 3.2s steps(8, end) infinite; transform-origin: 50% 94%; }

  @keyframes arrive { from { translate: -20cqw 0; opacity: 0; } to { translate: 0 0; opacity: 1; } }
  @keyframes seat-arrive { from { translate: 0 8cqh; opacity: 0; } to { translate: 0 0; opacity: 1; } }
  @keyframes rumble { 50% { translate: 0 -2px; } }
  @keyframes puff { 0% { opacity: 0; scale: .5; } 20% { opacity: .7; } 100% { opacity: 0; translate: 7cqw -3cqh; scale: 2; } }
  @keyframes rover-bounce { 0%, 100% { translate: 0 0; rotate: 0deg; } 30% { translate: -1cqw -.5cqh; rotate: -.7deg; } 65% { translate: -.5cqw .2cqh; rotate: .5deg; } }
  @keyframes aircraft-wobble { 0%, 35%, 75%, 100% { rotate: 0deg; translate: 0 0; } 43%, 59% { rotate: -.6deg; translate: 0 -.3cqh; } 51%, 67% { rotate: .5deg; } }
  /* Launch out of the cabinet, then reappear for the final beat before the scoreboard. */
  @keyframes eject { 0%, 31% { translate: 0 0; } 34%, 38% { translate: -.3cqw .7cqh; } 36%, 40% { translate: .3cqw .7cqh; } 44% { translate: 0 -12cqh; } 56%, 69% { translate: 0 -112cqh; opacity: 1; } 70% { translate: 0 -112cqh; opacity: 0; } 71% { translate: 0 3cqh; opacity: 0; } 82%, 100% { translate: 0 0; opacity: 1; } }
  @keyframes ignition { 0%, 37%, 70%, 100% { opacity: 0; scale: 1 .2; } 41%, 54% { opacity: 1; scale: 1 1; } 47%, 60% { opacity: 1; scale: .8 1.3; } }
  @keyframes launch-cloud { 0% { opacity: 0; scale: .3; } 15% { opacity: .8; } 100% { opacity: 0; scale: 2; translate: var(--smoke-x) -4cqh; } }

  @media (max-aspect-ratio: 4/5) {
    .vehicle-arrival, [data-vehicle='mars-rover'] .vehicle-arrival, [data-vehicle='aircraft'] .vehicle-arrival { width: 100%; height: 48%; left: 0; bottom: 0; }
    [data-vehicle='ejection-seat'] .vehicle-arrival { left: 13%; width: 74%; height: 48%; bottom: 2%; }
    .launch-pad { left: 28%; width: 44%; bottom: 1%; }
    .launch-smoke { left: 45%; bottom: 2%; width: 10cqw; }
    .exhaust, .rover-dust { width: 4cqw; height: 4cqw; }
  }
  @media (prefers-reduced-motion: reduce) {
    .victory-art.ready .vehicle-arrival, .victory-art.ready .vehicle-rig, .ready .exhaust, .ready .rover-dust, .ready .launch-flame, .ready .launch-smoke { animation: none; }
    .exhaust, .rover-dust, .launch-flame, .launch-smoke { display: none; }
  }
</style>
