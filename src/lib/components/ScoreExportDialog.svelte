<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { team } from '$lib/game/team'
  import { copy } from '$lib/game/i18n'
  import { scoreExportCard, type ScoreExportSnapshot, type ScoreExportTarget } from '$lib/game/score-export-data'
  import { renderScoreExport } from '$lib/game/score-export'
  import { canShareFile, shareFile } from '$lib/game/share-file'

  let { snapshot, initialTarget, onclose }: {
    snapshot: ScoreExportSnapshot; initialTarget: ScoreExportTarget; onclose: () => void
  } = $props()
  const text = $derived(copy[snapshot.language])
  // The user's selection is independent of later score updates or navigation.
  let target = $state<ScoreExportTarget>(untrack(() => initialTarget))
  const card = $derived(scoreExportCard(target, snapshot, team))
  let dialog: HTMLDialogElement
  let file = $state<File | null>(null)
  let previewUrl = $state('')
  let nativeShare = $state(false)
  let sharing = $state(false)
  let error = $state('')
  let shareMessage = $state('')
  let retry = $state(0)

  onMount(() => { dialog.showModal() })
  $effect(() => {
    const current = card
    void retry
    let disposed = false
    let url = ''
    file = null; previewUrl = ''; nativeShare = false; error = ''; shareMessage = ''
    renderScoreExport(current).then(result => {
      if (disposed) return
      url = URL.createObjectURL(result)
      file = result; previewUrl = url; nativeShare = canShareFile(result, navigator)
    }).catch(() => { if (!disposed) error = text.exportError })
    return () => { disposed = true; if (url) URL.revokeObjectURL(url) }
  })

  async function share() {
    if (!file || sharing) return
    sharing = true
    shareMessage = ''
    const outcome = await shareFile(file, navigator)
    sharing = false
    if (outcome === 'unavailable') shareMessage = text.shareUnavailable
  }
</script>

<dialog class="score-export-dialog" bind:this={dialog} aria-labelledby="score-export-title" onclose={onclose}>
  <header>
    <h2 id="score-export-title">{text.exportImage}</h2>
    <button type="button" class="export-close" aria-label={text.close} onclick={() => dialog.close()}>×</button>
  </header>
  <div class="export-layout">
    <div class="export-preview" aria-busy={!file && !error}>
      {#if previewUrl}<img src={previewUrl} alt={card.alt} width="1080" height="1350" />
      {:else if error}<p role="alert">{error}</p>
      {:else}<p role="status">{text.preparingImage}</p>{/if}
    </div>
    <div class="export-controls">
      <label for="score-export-selection">{text.exportImage}</label>
      <select id="score-export-selection" aria-label={text.exportImage} bind:value={target} disabled={sharing}>
        {#if snapshot.run}<option value="run">{text.yourScore}</option>{/if}
        <option value="scoreboard">{text.scoreboard}</option>
        <optgroup label={text.bestScore}>
          {#each team as member}<option value={member.id}>{member.name}</option>{/each}
        </optgroup>
      </select>
      {#if file}
        {#if nativeShare}<button type="button" class="nes-btn" onclick={share} disabled={sharing}>{text.share}</button>{/if}
        <a class="nes-btn" href={previewUrl} download={file.name}>{text.saveImage}</a>
      {:else if error}<button type="button" class="nes-btn" onclick={() => retry += 1}>{text.retry}</button>{/if}
      {#if shareMessage}<p class="export-message" role="status">{shareMessage}</p>{/if}
    </div>
  </div>
</dialog>

<style>
  .score-export-dialog { margin: auto; width: min(920px, 94vw); max-width: none; max-height: 94dvh; padding: 24px; overflow: auto; border: 4px solid var(--gold); background: #102033; color: var(--paper); box-shadow: 8px 8px #071426; }
  .score-export-dialog::backdrop { background: #050c19df; }
  header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
  h2 { margin: 0; font-size: 16px; line-height: 1.8; }
  .export-close { display: grid; place-items: center; min-width: 44px; min-height: 44px; border: 0; background: #243747; color: var(--paper); font-size: 24px; }
  .export-close:hover, .export-close:focus-visible { background: var(--gold); color: var(--ink); }
  .export-layout { display: grid; grid-template-columns: minmax(0, 1fr) 240px; align-items: start; gap: 24px; }
  .export-preview { min-height: 180px; display: grid; place-items: center; }
  .export-preview img { display: block; width: 100%; height: auto; max-height: 68dvh; object-fit: contain; image-rendering: pixelated; }
  .export-preview p, .export-message { font-size: 11px; line-height: 2; }
  .export-controls { display: flex; flex-direction: column; gap: 16px; }
  label { font-size: 11px; line-height: 1.8; }
  select { width: 100%; min-height: 44px; padding: 10px 8px; border: 2px solid #82918c; border-radius: 0; background: #192d40; color: var(--paper); font-size: 11px; line-height: 1.8; }
  .score-export-dialog .nes-btn { padding: 12px 20px 12px 12px; font-size: 11px; text-decoration: none; }
  select:focus-visible, .export-close:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
  @media (max-width: 640px) {
    .score-export-dialog { padding: 12px; }
    header { margin-bottom: 12px; } h2 { font-size: 12px; }
    .export-layout { grid-template-columns: minmax(0, 1fr); gap: 16px; }
    .export-preview img { max-height: 47dvh; }
    .export-controls { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    label, select, .export-message { grid-column: 1 / -1; }
    label { display: none; }
    .score-export-dialog .nes-btn { font-size: 10px; }
  }
</style>
