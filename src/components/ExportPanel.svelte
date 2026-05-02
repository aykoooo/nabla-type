<script lang="ts">
  import { store } from '$lib/store/simStore.svelte'
  import { GrayScott } from '$lib/simulation/GrayScott'
  import { prepareBinaryMask, renderSVG } from '$lib/export/SVGExporter'
  import type { TracingParams } from '$lib/tracing/types'
  import Select from './ui/Select.svelte'
  import MathInput from './ui/MathInput.svelte'

  let {
    getSimulation,
  }: {
    getSimulation: () => GrayScott | null
  } = $props()

  // ---- state ---------------------------------------------------------------

  let exporting = $state(false)
  let exportStatus = $state('')
  let exportPadding = $state(12)
  let pngScale = $state(1)
  let advancedOpen = $state(false)

  // Potrace params (direct TracingParams fields + UI-only threshold)
  let turdsize = $state(0)
  let alphamax = $state(0.9)
  let opttolerance = $state(0.18)
  let optcurve = $state(true)
  let threshold = $state('48')
  let splitPaths = $state(false)

  // ---- derived -------------------------------------------------------------

  const pngWidth = $derived(Math.max(1, Math.round(store.resolution.width * pngScale)))
  const pngHeight = $derived(Math.max(1, Math.round(store.resolution.height * pngScale)))

  // ---- presets -------------------------------------------------------------

  type Preset = { key: string; label: string; turdsize: number; alphamax: number; opttolerance: number; threshold: string }

  const presets: Preset[] = [
    { key: 'clean',    label: 'Clean',    turdsize: 8, alphamax: 1.0,  opttolerance: 0.5,  threshold: '64' },
    { key: 'balanced', label: 'Balanced', turdsize: 2, alphamax: 0.9,  opttolerance: 0.2,  threshold: '48' },
    { key: 'detailed', label: 'Detailed', turdsize: 1, alphamax: 0.7,  opttolerance: 0.15, threshold: '32' },
    { key: 'organic',  label: 'Organic',  turdsize: 0, alphamax: 0.5,  opttolerance: 0.1,  threshold: '16' },
  ]

  function applyPreset(p: Preset) {
    turdsize = p.turdsize
    alphamax = p.alphamax
    opttolerance = p.opttolerance
    threshold = p.threshold
    // optcurve unchanged — always true for presets
  }

  // ---- utilities -----------------------------------------------------------

  function download(data: string | Blob, filename: string, mime: string) {
    const blob = typeof data === 'string' ? new Blob([data], { type: mime }) : data
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ---- export handlers -----------------------------------------------------

  async function exportSVG() {
    const sim = getSimulation()
    if (!sim || exporting) return

    exporting = true
    exportStatus = 'Reading pixels…'

    try {
      const pixels = sim.readPixels()
      const width = sim.getWidth()
      const height = sim.getHeight()

      exportStatus = 'Preparing mask…'

      // Build RGBA buffer from WebGL framebuffer (G channel = chemical B).
      // Flip Y — WebGL origin is bottom-left.
      const mask = new Uint8Array(width * height * 4)

      // Contrast-stretch pass
      let minVal = 255, maxVal = 0
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const v = pixels[((height - 1 - y) * width + x) * 4 + 1]
          if (v < minVal) minVal = v
          if (v > maxVal) maxVal = v
        }
      }
      const range = Math.max(1, maxVal - minVal)

      // Fill mask
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIdx = ((height - 1 - y) * width + x) * 4
          const dstIdx = (y * width + x) * 4
          const g = Math.round(((pixels[srcIdx + 1] - minVal) / range) * 255)
          mask[dstIdx] = mask[dstIdx + 1] = mask[dstIdx + 2] = g
          mask[dstIdx + 3] = 255
        }
      }

      exportStatus = 'Tracing with potrace…'

      const imageData = prepareBinaryMask(mask, width, height, Number(threshold))

      const params: TracingParams = {
        turdsize,
        alphamax,
        opttolerance,
        optcurve,
        turnpolicy: 'minority',
      }

      console.log('[ExportPanel] Tracing:', JSON.stringify(params))

      const svg = await renderSVG(imageData, params, {
        padding: exportPadding,
        svgWidth: width,
        svgHeight: height,
        split: splitPaths,
        metadata: {
          seed: store.seedText,
          timestamp: new Date().toISOString(),
          resolution: { width, height },
          iterations: store.iterationCount,
          simParams: {
            feed: store.params.feed,
            kill: store.params.kill,
            da: store.params.da,
            db: store.params.db,
            dt: store.params.dt,
          },
          tracingParams: params,
        },
      })

      exportStatus = 'Downloading…'
      download(svg, `nabla-type-${Date.now()}.svg`, 'image/svg+xml')

      exportStatus = 'Done!'
      setTimeout(() => (exportStatus = ''), 2000)
    } catch (err) {
      console.error('SVG export failed:', err)
      exportStatus = 'Export failed.'
      setTimeout(() => (exportStatus = ''), 3000)
    } finally {
      exporting = false
    }
  }

  async function exportPNG() {
    if (exporting) return
    exporting = true
    exportStatus = 'Generating PNG…'

    try {
      const canvas = document.querySelector('canvas')
      if (!canvas) throw new Error('Canvas not found')

      const outW = Math.max(1, Math.round(pngWidth))
      const outH = Math.max(1, Math.round(pngHeight))

      if (outW === canvas.width && outH === canvas.height) {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
        if (!blob) throw new Error('toBlob returned null')
        download(blob, `nabla-type-${Date.now()}.png`, 'image/png')
      } else {
        const outCanvas = new OffscreenCanvas(outW, outH)
        const outCtx = outCanvas.getContext('2d')
        if (!outCtx) throw new Error('Output context unavailable')
        outCtx.imageSmoothingEnabled = false
        outCtx.drawImage(canvas, 0, 0, outW, outH)
        const blob = await outCanvas.convertToBlob({ type: 'image/png' })
        download(blob, `nabla-type-${Date.now()}.png`, 'image/png')
      }

      exportStatus = 'Done!'
      setTimeout(() => (exportStatus = ''), 2000)
    } catch (err) {
      console.error('PNG export failed:', err)
      exportStatus = 'Export failed.'
      setTimeout(() => (exportStatus = ''), 3000)
    } finally {
      exporting = false
    }
  }
</script>

<div class="flex flex-col gap-3">
  <p class="text-[11px] text-black/70">
    Output: {pngWidth} × {pngHeight}, padding {exportPadding}
  </p>

  <div class="flex gap-2">
    <button
      class="border border-black bg-black text-white px-3 py-1.5 text-xs font-semibold tracking-wide disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
      onclick={exportSVG}
      disabled={exporting}
    >
      Export SVG
    </button>
    <button
      class="border border-black bg-white text-black hover:bg-base-200 px-3 py-1.5 text-xs font-semibold tracking-wide disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
      onclick={exportPNG}
      disabled={exporting}
    >
      Export PNG
    </button>
  </div>

  <!-- Presets -->
  <div class="grid grid-cols-4 gap-2">
    {#each presets as p}
      <button
        class="border border-black px-2 py-1.5 text-xs font-semibold bg-neutral-50 hover:bg-neutral-100"
        onclick={() => applyPreset(p)}
      >
        {p.label}
      </button>
    {/each}
  </div>

  <!-- Threshold -->
  <label class="flex flex-col gap-1">
    <span>Threshold</span>
    <Select
      class="h-[28px] border border-black px-2 py-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 bg-white"
      items={[
        { value: '128', label: '128' },
        { value: '64',  label: '64' },
        { value: '48',  label: '48' },
        { value: '32',  label: '32' },
        { value: '16',  label: '16' },
      ]}
      value={threshold}
      onValueChange={(v) => { if (v !== undefined) threshold = v }}
    />
    <span class="text-[10px] text-black/60">Lower = more detail</span>
  </label>

  <!-- invert hint — always on for potrace -->
  <p class="text-[10px] text-black/50 italic">Inversion is automatic — potrace needs black-on-white.</p>

  <!-- Advanced toggle -->
  <button
    type="button"
    class="text-left border border-black px-2 py-1.5 text-xs font-semibold bg-neutral-50 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
    onclick={() => (advancedOpen = !advancedOpen)}
  >
    Advanced {advancedOpen ? '−' : '+'}
  </button>

  {#if advancedOpen}
    <div class="grid grid-cols-2 gap-2 text-xs">
      <!-- Padding -->
      <label class="flex flex-col gap-1">
        <span>Padding</span>
        <MathInput
          bind:value={exportPadding}
          min={0} max={128} decimals={0}
          class="border border-black px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 w-full"
        />
      </label>
      <!-- PNG Scale -->
      <label class="flex flex-col gap-1">
        <span>PNG Scale</span>
        <Select
          class="h-[28px] border border-black px-2 py-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 bg-white"
          items={[
            { value: '1', label: '1x' },
            { value: '2', label: '2x' },
            { value: '4', label: '4x' },
          ]}
          value={String(pngScale)}
          onValueChange={(v) => { pngScale = Number(v) }}
        />
      </label>
      <div class="flex flex-col gap-1">
        <span>PNG Width</span>
        <span class="border border-black px-2 py-1.5 text-xs font-mono bg-neutral-50 w-full">{pngWidth}px</span>
      </div>
      <div class="flex flex-col gap-1">
        <span>PNG Height</span>
        <span class="border border-black px-2 py-1.5 text-xs font-mono bg-neutral-50 w-full">{pngHeight}px</span>
      </div>

      <!-- Potrace advanced params -->
      <div class="col-span-2 mt-2 border-t border-black pt-2">
        <span class="text-[11px] font-semibold">Potrace Parameters</span>
      </div>

      <label class="flex flex-col gap-1">
        <span>turdsize (speckle suppression)</span>
        <MathInput
          bind:value={turdsize}
          min={0} max={100} decimals={0}
          class="border border-black px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 w-full"
        />
        <span class="text-[10px] text-black/60">0 = keep all holes</span>
      </label>

      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={optcurve}
          onchange={(e) => optcurve = (e.target as HTMLInputElement).checked}
          class="w-4 h-4"
        />
        <span class="text-[11px] font-semibold">optcurve</span>
      </label>

      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={splitPaths}
          onchange={(e) => splitPaths = (e.target as HTMLInputElement).checked}
          class="w-4 h-4"
        />
        <span class="text-[11px] font-semibold">Individual paths (for editing)</span>
      </label>

      <label class="flex flex-col gap-1">
        <span>alphamax (corner threshold)</span>
        <input
          type="range" min="0" max="1.34" step="0.01"
          value={alphamax}
          oninput={(e) => alphamax = parseFloat((e.target as HTMLInputElement).value)}
          class="w-full"
        />
        <span class="text-[10px] text-black/60">{alphamax.toFixed(2)} (lower = more corners)</span>
      </label>

      <label class="flex flex-col gap-1">
        <span>opttolerance (curve tolerance)</span>
        <input
          type="range" min="0" max="2" step="0.05"
          value={opttolerance}
          oninput={(e) => opttolerance = parseFloat((e.target as HTMLInputElement).value)}
          class="w-full"
        />
        <span class="text-[10px] text-black/60">{opttolerance.toFixed(2)} (lower = more detail)</span>
      </label>
    </div>
  {/if}

  {#if exportStatus}
    <p class="text-xs font-mono text-black/60">{exportStatus}</p>
  {/if}
</div>