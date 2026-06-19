<script lang="ts">
  import { exportPrefs, schedulePersistExportPrefs } from '$lib/store/exportPrefs.svelte'
  import { store } from '$lib/store/simStore.svelte'
  import MathInput from './ui/MathInput.svelte'
  import Download from 'lucide-svelte/icons/download'
  import Copy from 'lucide-svelte/icons/copy'
  import Check from 'lucide-svelte/icons/check'
  import Checkbox from './ui/Checkbox.svelte'

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

  const viewW = $derived(Math.max(1, store.resolution.width + exportPrefs.svg.padding * 2))
  const viewH = $derived(Math.max(1, store.resolution.height + exportPrefs.svg.padding * 2))

  function setScaleSnap(s: number) {
    exportPrefs.svg.threshold = s
    schedulePersistExportPrefs()
  }

  function snapButtonClass(active: boolean): string {
    const base =
      'flex-1 h-7 px-1 border border-black text-[10px] font-bold uppercase tracking-wide inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 transition-colors'
    return active
      ? `${base} bg-black text-white`
      : `${base} bg-white text-black hover:bg-black hover:text-white`
  }
</script>

<div class="flex flex-col gap-4">
  <!-- Output spec -->
  <div class="flex flex-col gap-0.5">
    <span class="text-[11px] font-bold uppercase tracking-wider">Output</span>
    <span class="text-[10px] font-mono text-brutal-secondary">
      {store.resolution.width} × {store.resolution.height}px → viewBox 0 0 {viewW} {viewH}
    </span>
    <span class="text-[10px] text-brutal-secondary">
      SVG ignores the colormap; output is black-on-white.
    </span>
  </div>

  <!-- Threshold -->
  <div class="flex flex-col gap-1.5">
    <div class="flex justify-between items-center gap-2">
      <span class="text-[11px] font-bold uppercase tracking-wider">Threshold</span>
      <MathInput
        bind:value={exportPrefs.svg.threshold}
        min={0}
        max={255}
        decimals={0}
        class="border border-black px-2 py-1 text-xs font-mono w-14 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
        onblur={schedulePersistExportPrefs}
      />
    </div>
    <input
      type="range"
      min="0"
      max="255"
      step="1"
      class="brutal-slider"
      bind:value={exportPrefs.svg.threshold}
      onchange={schedulePersistExportPrefs}
    />
    <div class="flex justify-between gap-1">
      {#each [16, 32, 48, 64, 128] as t}
        <button
          type="button"
          class={snapButtonClass(exportPrefs.svg.threshold === t)}
          onclick={() => setScaleSnap(t)}
        >
          {t}
        </button>
      {/each}
    </div>
    <span class="text-[10px] text-brutal-secondary">
      Lower = more detail and noise. Start at 48.
    </span>
  </div>

  <!-- Vectorization -->
  <div class="flex flex-col gap-3 border-t border-black pt-3">
    <span class="text-[11px] font-bold uppercase tracking-wider">Vectorization</span>

    <!-- Speckle suppression -->
    <div class="flex flex-col gap-1">
      <div class="flex justify-between items-center gap-2">
        <span class="text-[10px] font-semibold uppercase tracking-wide">Speckle suppression</span>
        <MathInput
          bind:value={exportPrefs.svg.turdsize}
          min={0}
          max={100}
          decimals={0}
          class="border border-black px-2 py-1 text-xs font-mono w-12 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
          onblur={schedulePersistExportPrefs}
        />
      </div>
      <span class="text-[10px] text-brutal-secondary">0 = keep all holes.</span>
    </div>

    <!-- Corner threshold -->
    <div class="flex flex-col gap-1">
      <div class="flex justify-between items-center gap-2">
        <span class="text-[10px] font-semibold uppercase tracking-wide">Corner threshold</span>
        <span class="text-[10px] font-mono text-brutal-secondary">
          {exportPrefs.svg.alphamax.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="1.34"
        step="0.01"
        class="brutal-slider"
        bind:value={exportPrefs.svg.alphamax}
        onchange={schedulePersistExportPrefs}
      />
      <span class="text-[10px] text-brutal-secondary">Lower = sharper corners.</span>
    </div>

    <!-- Curve tolerance -->
    <div class="flex flex-col gap-1">
      <div class="flex justify-between items-center gap-2">
        <span class="text-[10px] font-semibold uppercase tracking-wide">Curve tolerance</span>
        <span class="text-[10px] font-mono text-brutal-secondary">
          {exportPrefs.svg.opttolerance.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="2"
        step="0.05"
        class="brutal-slider"
        bind:value={exportPrefs.svg.opttolerance}
        onchange={schedulePersistExportPrefs}
      />
      <span class="text-[10px] text-brutal-secondary">Lower = more points, smoother curves.</span>
    </div>

    <!-- Optimize curves -->
    <Checkbox bind:checked={exportPrefs.svg.optcurve} onchange={schedulePersistExportPrefs}>
      Optimize curves
    </Checkbox>

    <!-- Split paths -->
    <Checkbox bind:checked={exportPrefs.svg.splitPaths} onchange={schedulePersistExportPrefs}>
      Split paths (for editing)
    </Checkbox>
  </div>

  <!-- Framing -->
  <div class="flex flex-col gap-3 border-t border-black pt-3">
    <span class="text-[11px] font-bold uppercase tracking-wider">Framing</span>

    <div class="flex flex-col gap-1">
      <span class="text-[10px] font-semibold uppercase tracking-wide">Padding</span>
      <MathInput
        bind:value={exportPrefs.svg.padding}
        min={0}
        max={128}
        decimals={0}
        suffix="px"
        class="border border-black px-2 py-1.5 text-xs font-mono w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
        onblur={schedulePersistExportPrefs}
      />
    </div>

    <Checkbox bind:checked={exportPrefs.svg.includeMetadata} onchange={schedulePersistExportPrefs}>
      Include metadata in SVG
    </Checkbox>

    <Checkbox
      bind:checked={exportPrefs.svg.includeFontInMetadata}
      onchange={schedulePersistExportPrefs}
      disabled={!exportPrefs.svg.includeMetadata}
    >
      Add font name to metadata
    </Checkbox>
  </div>

  <!-- Actions -->
  <div class="flex gap-2">
    <button
      type="button"
      class="flex-1 h-7 px-3 inline-flex items-center justify-center gap-1.5 border border-black bg-black text-white text-xs font-bold uppercase tracking-wide disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 transition-colors"
      onclick={onDownload}
      disabled={busy}
      title="Download SVG"
    >
      <Download class="w-3.5 h-3.5" strokeWidth={2.5} />
      {busy ? 'Tracing…' : 'Download SVG'}
    </button>
    <button
      type="button"
      class="h-7 px-3 inline-flex items-center justify-center gap-1.5 border border-black bg-white text-black hover:bg-black hover:text-white text-xs font-bold uppercase tracking-wide disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 transition-colors"
      onclick={onCopy}
      disabled={busy}
      aria-label="Copy SVG code to clipboard"
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
