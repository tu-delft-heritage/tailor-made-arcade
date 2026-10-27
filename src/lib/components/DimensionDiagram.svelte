<script lang="ts">
  import { dimensionAxes, dimensionGeometry, type Dimensions, type DimensionAxis } from '$lib/game/dimensions'
  import { fieldLabels } from '$lib/game/questions/metadata'
  import { copy } from '$lib/game/i18n'
  import type { Language } from '$lib/game/types'
  let { dimensions, asked, language, revealed = false }: { dimensions: Dimensions; asked: DimensionAxis; language: Language; revealed?: boolean } = $props()
  const geometry = $derived(dimensionGeometry(dimensions))
  const colors = { height: '#84d4df', width: '#f2d17b', depth: '#d5a5df' }
  const value = (axis: DimensionAxis) => axis === asked && !revealed ? '?' : dimensions[axis]!.label
  const labelPosition = (edge: NonNullable<ReturnType<typeof dimensionGeometry>>['edges'][number]) => {
    const x = (edge.from[0] + edge.to[0]) / 2
    const y = (edge.from[1] + edge.to[1]) / 2
    if (edge.from[0] === edge.to[0]) return { x: x - 14, y, anchor: 'end' }
    if (geometry?.flat) return { x, y: y + 22, anchor: 'middle' }
    return edge.axis === 'width' ? { x: x - 10, y: y + 22, anchor: 'end' } : { x: x + 14, y: y + 18, anchor: 'start' }
  }
</script>

{#if geometry}
  <figure class="dimension-diagram" aria-label={copy[language].dimensionDiagram}>
    <svg viewBox="-80 -12 480 210" role="img" aria-label={`${geometry.flat ? copy[language].flatShape : copy[language].solidShape}. ${dimensionAxes.filter(axis => dimensions[axis]).map(axis => `${fieldLabels[axis][language]}: ${value(axis)}`).join(', ')}`}>
      {#each geometry.faces as points, index}
        <polygon points={points.map(point => point.join(',')).join(' ')} fill={['#406371', '#274451', '#72908e'][index]} stroke="#b6c9bf" stroke-width="1.5" stroke-linejoin="miter" />
      {/each}
      {#each geometry.edges as edge}
        {@const label = labelPosition(edge)}
        <line x1={edge.from[0]} y1={edge.from[1]} x2={edge.to[0]} y2={edge.to[1]} stroke={colors[edge.axis]} stroke-width={edge.axis === asked ? 4 : 2.5} />
        <line class="dimension-guide" x1={(edge.from[0] + edge.to[0]) / 2} y1={(edge.from[1] + edge.to[1]) / 2} x2={label.x} y2={label.y} stroke={colors[edge.axis]} />
        <text x={label.x} y={label.y} text-anchor={label.anchor} class:asked={edge.axis === asked} fill={colors[edge.axis]}>{value(edge.axis)}</text>
      {/each}
    </svg>
  </figure>
{/if}

<style>
  .dimension-diagram { position: absolute; top: 24cqh; left: 41cqw; width: 54cqw; height: 32cqh; background: #102334e8; border-bottom: 3px solid #8c9e97; }
  svg { display: block; width: 100%; height: 100%; overflow: visible; }
  text { font-size: 12px; dominant-baseline: middle; paint-order: stroke; stroke: #102334; stroke-width: 5px; stroke-linejoin: round; }
  text.asked { font-size: 15px; }
  .dimension-guide { stroke-width: 1; opacity: .7; }
  @media (max-aspect-ratio: 4/5) {
    .dimension-diagram { top: 27cqh; left: 36cqw; width: 62cqw; height: 28cqh; }
    text { font-size: 15px; } text.asked { font-size: 18px; }
  }
</style>
