<script lang="ts">
  let { seconds, label, announcement }: { seconds: number; label: string; announcement: string } = $props()
</script>

<div class="last-seconds" role="status" aria-live="assertive" aria-atomic="true">
  <span class="sr-only">{announcement.replace('{seconds}', String(seconds))} — {label}</span>
  {#key seconds}<strong aria-hidden="true">{seconds}</strong>{/key}
</div>

<style>
  .last-seconds { position: absolute; z-index: 8; right: -2cqw; top: -2cqh; width: 9cqh; height: 9cqh; display: grid; place-items: center; color: #ffe4a1; background: #572b30f5; border: 3px solid #ec9c64; box-shadow: 4px 5px #132134; pointer-events: none; }
  strong { display: block; font-size: 5.5cqh; line-height: 1.2; text-shadow: 3px 3px #251b2a; animation: countdown-step .7s steps(4, end) both; }
  @keyframes countdown-step { from { transform: scale(1.3); color: #fff9d8; } to { transform: scale(1); color: #ffc98c; } }
  @media (max-aspect-ratio: 4/5) {
    .last-seconds { width: 12cqw; height: 12cqw; right: -2cqw; top: -1cqh; border-width: 2px; }
    strong { font-size: 8cqw; }
  }
  @media (prefers-reduced-motion: reduce) { strong { animation: none; } }
</style>
