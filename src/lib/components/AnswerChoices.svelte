<script lang="ts">
  let { choices, activeChoice, disabled = false, label, onanswer }: {
    choices: string[]; activeChoice: number; disabled?: boolean; label: string; onanswer: (choice: string) => void
  } = $props()
</script>

<div class="answer-grid" role="listbox" aria-label={label}
  aria-activedescendant={`choice-${activeChoice}`} aria-disabled={disabled} tabindex="-1">
  {#each choices as choice, index}
    <button id={`choice-${index}`} type="button" role="option" aria-selected={index === activeChoice}
      class="nes-btn answer-option" class:highlighted={index === activeChoice && !disabled} class:waiting={disabled}
      {disabled} onclick={() => onanswer(choice)}>
      <span class="selection-arrow" aria-hidden="true">{index === activeChoice && !disabled ? '▶' : ''}</span>
      <span>{choice}</span>
    </button>
  {/each}
</div>
