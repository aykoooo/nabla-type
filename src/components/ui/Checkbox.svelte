<script lang="ts">
  import Check from 'lucide-svelte/icons/check'

  let {
    checked = $bindable(false),
    disabled = false,
    onchange,
    children,
  }: {
    checked?: boolean
    disabled?: boolean
    onchange?: (e: Event) => void
    children?: import('svelte').Snippet
  } = $props()

  const boxClass = $derived(
    checked
      ? 'w-3.5 h-3.5 border border-black bg-black text-white inline-flex items-center justify-center transition-colors'
      : 'w-3.5 h-3.5 border border-black bg-white inline-flex items-center justify-center transition-colors',
  )

  function toggle() {
    if (disabled) return
    checked = !checked
    onchange?.(new Event('change'))
  }
</script>

<button
  type="button"
  role="checkbox"
  aria-checked={checked}
  {disabled}
  onclick={toggle}
  class="inline-flex items-center gap-1.5 text-left text-[10px] font-semibold uppercase tracking-wide cursor-pointer select-none bg-transparent"
  class:opacity-50={disabled}
  class:cursor-not-allowed={disabled}
>
  <span class={boxClass} aria-hidden="true">
    {#if checked}
      <Check class="w-3 h-3" strokeWidth={3} />
    {/if}
  </span>
  {#if children}
    <span>{@render children()}</span>
  {/if}
</button>
