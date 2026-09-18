<script lang="ts">
  import blueAisle from '$lib/assets/depot/blue-aisle.png'
  import compactStacks from '$lib/assets/depot/compact-stacks.png'
  import machineHall from '$lib/assets/depot/machine-hall.png'

  let { variant = 0 }: { variant?: number } = $props()
  const scenes = [
    { name: 'blue-aisle', src: blueAisle },
    { name: 'compact-stacks', src: compactStacks },
    { name: 'machine-hall', src: machineHall }
  ]
  const scene = $derived(scenes[variant % scenes.length])
</script>

<div class="depot-backdrop" data-scene={scene.name} aria-hidden="true">
  {#each scenes as background}
    <img src={background.src} alt="" class:active={scene === background} draggable="false" />
  {/each}
</div>
