<script lang="ts">
  import { exportPrefs, schedulePersistExportPrefs } from '$lib/store/exportPrefs.svelte'
  import { store } from '$lib/store/simStore.svelte'
  import MathInput from './ui/MathInput.svelte'
  import Download from 'lucide-svelte/icons/download'
  import Copy from 'lucide-svelte/icons/copy'
  import Check from 'lucide-svelte/icons/check'

  let {
    busy,
    copied,
    onDownload,
    onCopy,
  }: {
    busy: boolean
    copied: boolean
    onDownload: () => void
    onCopy: () => void
  } = $props()

  const outW = $derived(
    Math.max(1, Math.round(store.resolution.width * exportPrefs.png.scale)),
  )
  const outH = $derived(
    Math.max(1, Math.round(store.resolution.height * exportPrefs.png.scale)),
  )

  const scaleLocks = [1, 2, 4, 8]

  function setScale(s: number) {
    exportPrefs.png.scale = s
    schedulePersistExportPrefs()
  }

  function lockButtonClass(active: boolean): string {
    const base =
      'h-7 px-2 border border-black text-[10px] font-bold uppercase tracking-wide inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 transition-colors'
    return active
      ? `${base} bg-black text-white`
      : `${base} bg-white text-black hover:bg-black hover:text-white`
  }
</script>

<div class="flex flex-col gap-3">
  <!-- Output spec -->
  <div class="flex flex-col gap-0.5">
    <span class="text-[11px] font-bold uppercase tracking-wider">Output</span>
    <span class="text-[10px] font-mono text-brutal-secondary">
      {store.resolution.width} × {store.resolution.height}px → {outW} × {outH}px
    </span>
  </div>

  <!-- Scale -->
  <div class="flex flex-col gap-1.5">
    <span class="text-[11px] font-bold uppercase tracking-wider">Scale</span>
    <div class="flex gap-2 items-center">
      <MathInput
        bind:value={exportPrefs.png.scale}
        min={0.1}
        max={8}
        decimals={2}
        suffix="x"
        class="border border-black px-2 py-1.5 text-xs font-mono w-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
        onblur={schedulePersistExportPrefs}
      />
      <div class="flex gap-1">
        {#each scaleLocks as s}
          <button
            type="button"
            class={lockButtonClass(exportPrefs.png.scale === s)}
            onclick={() => setScale(s)}
          >
            {s}x
          </button>
        {/each}
      </div>
    </div>
    {#if outW > 4096 || outH > 4096}
      <span class="text-[10px] text-brutal-destructive">
        Large export may be slow or fail.
      </span>
    {/if}
  </div>

  <!-- Actions -->
  <div class="flex gap-2">
    <button
      type="button"
      class="flex-1 h-7 px-3 inline-flex items-center justify-center gap-1.5 border border-black bg-black text-white text-xs font-bold uppercase tracking-wide disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 transition-colors"
      onclick={onDownload}
      disabled={busy}
      title="Download PNG"
    >
      <Download class="w-3.5 h-3.5" strokeWidth={2.5} />
      {busy ? 'Exporting…' : 'Download PNG'}
    </button>
    <button
      type="button"
      class="h-7 px-3 inline-flex items-center justify-center gap-1.5 border border-black bg-white text-black hover:bg-black hover:text-white text-xs font-bold uppercase tracking-wide disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 transition-colors"
      onclick={onCopy}
      disabled={busy}
      aria-label="Copy PNG to clipboard"
    >
      {#if copied}
        <Check class="w-3.5 h-3.5" strokeWidth={2.5} />
      {:else}
        <Copy class="w-3.5 h-3.5" strokeWidth={2.5} />
      {/if}
      {copied ? 'Copied' : 'Copy'}
    </button>
  </div>
</div>
