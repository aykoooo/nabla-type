<script lang="ts">
  import { store } from '$lib/store/simStore.svelte'
  import {
    exportPrefs,
    schedulePersistExportPrefs,
    resetExportPrefs,
  } from '$lib/store/exportPrefs.svelte'
  import { buildFilename, type FilenameContext } from '$lib/export/filenameBuilder'
  import {
    copyPngBlobToClipboard,
    copyTextToClipboard,
  } from '$lib/export/clipboard'
  import { prepareBinaryMask, renderSVG } from '$lib/export/SVGExporter'
  import { GrayScott } from '$lib/simulation/GrayScott'
  import type { TracingParams } from '$lib/tracing/types'
  import PngExportSection from './PngExportSection.svelte'
  import SvgExportSection from './SvgExportSection.svelte'
  import { ToggleGroup } from 'bits-ui'

  let {
    getSimulation,
  }: {
    getSimulation: () => GrayScott | null
  } = $props()

  let exportingFormat = $state<'png' | 'svg' | null>(null)
  let status = $state('')
  let copiedFormat = $state<'png' | 'svg' | null>(null)

  const filenameKeys = [
    { key: 'includeSeed', label: 'Seed' },
    { key: 'includeFont', label: 'Font' },
    { key: 'includeResolution', label: 'Resolution' },
    { key: 'includeTimestamp', label: 'Timestamp' },
    { key: 'includeIteration', label: 'Iteration' },
    { key: 'includeFeed', label: 'Feed' },
    { key: 'includeKill', label: 'Kill' },
  ] as const

  const selectedFilenameValues = $derived(
    filenameKeys
      .filter((k) => exportPrefs.filename[k.key])
      .map((k) => k.key),
  )

  function setFilenameValues(values: string[]) {
    const next = new Set(values)
    for (const { key } of filenameKeys) {
      exportPrefs.filename[key] = next.has(key)
    }
    schedulePersistExportPrefs()
  }

  const filenameCtx = $derived<FilenameContext>({
    seedText: store.seedText,
    fontName: store.seedFontName,
    width: store.resolution.width,
    height: store.resolution.height,
    feed: store.params.feed,
    kill: store.params.kill,
    iteration: store.iterationCount,
  })

  const pngFilename = $derived(
    buildFilename(
      'png',
      {
        ...filenameCtx,
        width: Math.max(1, Math.round(filenameCtx.width * exportPrefs.png.scale)),
        height: Math.max(1, Math.round(filenameCtx.height * exportPrefs.png.scale)),
      },
      exportPrefs.filename,
    ),
  )

  const svgFilename = $derived(buildFilename('svg', filenameCtx, exportPrefs.filename))

  function setFormat(format: 'png' | 'svg') {
    exportPrefs.lastFormat = format
    schedulePersistExportPrefs()
  }

  function tabClass(active: boolean): string {
    const base =
      'text-xs font-bold uppercase tracking-wider h-7 px-2 inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/30 transition-colors'
    return active
      ? `${base} bg-black text-white`
      : `${base} bg-white text-black hover:bg-black hover:text-white`
  }

  let statusTimeout: ReturnType<typeof setTimeout> | null = null
  function setStatus(text: string, duration = 0) {
    status = text
    if (statusTimeout) clearTimeout(statusTimeout)
    if (duration > 0) {
      statusTimeout = setTimeout(() => (status = ''), duration)
    }
  }

  let copiedTimeout: ReturnType<typeof setTimeout> | null = null
  function flashCopied(format: 'png' | 'svg') {
    copiedFormat = format
    if (copiedTimeout) clearTimeout(copiedTimeout)
    copiedTimeout = setTimeout(() => (copiedFormat = null), 1500)
  }

  function triggerDownload(data: Blob | string, filename: string, mime: string) {
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

  async function generatePngBlob(): Promise<Blob> {
    const sim = getSimulation()
    if (!sim) throw new Error('Simulation not available')

    const canvas = sim.getCanvasElement()
    if (!canvas) throw new Error('Canvas not found')

    const srcW = canvas.width
    const srcH = canvas.height
    const outW = Math.max(1, Math.round(srcW * exportPrefs.png.scale))
    const outH = Math.max(1, Math.round(srcH * exportPrefs.png.scale))

    if (outW === srcW && outH === srcH) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
      )
      if (!blob) throw new Error('toBlob returned null')
      return blob
    }

    if (typeof OffscreenCanvas !== 'undefined') {
      const oc = new OffscreenCanvas(outW, outH)
      const ctx = oc.getContext('2d')
      if (!ctx) throw new Error('Output context unavailable')
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(canvas, 0, 0, outW, outH)
      return oc.convertToBlob({ type: 'image/png' })
    }

    const fallback = document.createElement('canvas')
    fallback.width = outW
    fallback.height = outH
    const ctx = fallback.getContext('2d')
    if (!ctx) throw new Error('Fallback context unavailable')
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(canvas, 0, 0, outW, outH)
    const blob = await new Promise<Blob | null>((resolve) =>
      fallback.toBlob(resolve, 'image/png'),
    )
    if (!blob) throw new Error('Fallback toBlob returned null')
    return blob
  }

  async function generateSvgString(): Promise<string> {
    const sim = getSimulation()
    if (!sim) throw new Error('Simulation not available')

    setStatus('Reading pixels…')
    const pixels = sim.readPixels()
    const width = sim.getWidth()
    const height = sim.getHeight()

    setStatus('Preparing mask…')
    const imageData = prepareBinaryMask(pixels, width, height, {
      threshold: exportPrefs.svg.threshold,
      yFlip: true,
      contrastStretch: true,
    })

    setStatus('Tracing…')
    const params: TracingParams = {
      turdsize: exportPrefs.svg.turdsize,
      alphamax: exportPrefs.svg.alphamax,
      opttolerance: exportPrefs.svg.opttolerance,
      optcurve: exportPrefs.svg.optcurve,
      turnpolicy: 'minority',
    }

    return await renderSVG(imageData, params, {
      padding: exportPrefs.svg.padding,
      svgWidth: width,
      svgHeight: height,
      split: exportPrefs.svg.splitPaths,
      includeMetadata: exportPrefs.svg.includeMetadata,
      metadata: {
        seed: store.seedText,
        fontName: exportPrefs.svg.includeFontInMetadata
          ? store.seedFontName || undefined
          : undefined,
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
  }

  /** Run an export action under the shared busy-guard / try-catch / status umbrella. */
  async function runExport(
    format: 'png' | 'svg',
    failLabel: string,
    action: () => Promise<void>,
  ): Promise<void> {
    if (exportingFormat) return
    exportingFormat = format
    try {
      await action()
    } catch (err) {
      console.error(`${failLabel}:`, err)
      setStatus(`${failLabel}.`, 3000)
    } finally {
      exportingFormat = null
    }
  }

  async function handlePngDownload() {
    await runExport('png', 'PNG export failed', async () => {
      setStatus('Generating PNG…')
      const blob = await generatePngBlob()
      triggerDownload(blob, pngFilename, 'image/png')
      setStatus('Done', 2000)
    })
  }

  async function handlePngCopy() {
    await runExport('png', 'PNG copy failed', async () => {
      setStatus('Copying PNG…')
      const blob = await generatePngBlob()
      const ok = await copyPngBlobToClipboard(blob)
      if (ok) {
        flashCopied('png')
        setStatus('PNG copied', 2000)
      } else {
        triggerDownload(blob, pngFilename, 'image/png')
        setStatus('Clipboard unsupported — downloaded PNG', 3000)
      }
    })
  }

  async function handleSvgDownload() {
    await runExport('svg', 'SVG export failed', async () => {
      const svg = await generateSvgString()
      triggerDownload(svg, svgFilename, 'image/svg+xml')
      setStatus('Done', 2000)
    })
  }

  async function handleSvgCopy() {
    await runExport('svg', 'SVG copy failed', async () => {
      setStatus('Copying SVG…')
      const svg = await generateSvgString()
      const ok = await copyTextToClipboard(svg)
      if (ok) {
        flashCopied('svg')
        setStatus('SVG copied', 2000)
      } else {
        triggerDownload(svg, svgFilename, 'image/svg+xml')
        setStatus('Clipboard unsupported — downloaded SVG', 3000)
      }
    })
  }
</script>

<div class="flex flex-col gap-3">
  <!-- Filename tokens -->
  <div class="flex flex-col gap-2">
    <span class="text-[11px] font-bold uppercase tracking-wider">Filename</span>

    <ToggleGroup.Root
      type="multiple"
      value={selectedFilenameValues}
      onValueChange={(v) => setFilenameValues(v ?? [])}
      class="flex flex-wrap gap-1.5"
    >
      {#each filenameKeys as { key, label }}
        <ToggleGroup.Item
          value={key}
          class="h-6 px-2 text-[10px] font-bold uppercase tracking-wide border border-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 transition-colors {exportPrefs.filename[key] ? 'bg-black text-white' : 'bg-white text-black hover:bg-black hover:text-white'}"
          aria-pressed={exportPrefs.filename[key]}
        >
          {label}
        </ToggleGroup.Item>
      {/each}
    </ToggleGroup.Root>

    <p
      class="text-[10px] font-mono text-brutal-secondary break-all border border-black px-2 py-1.5 bg-brutal-surface"
      aria-live="polite"
    >
      {exportPrefs.lastFormat === 'png' ? pngFilename : svgFilename}
    </p>
  </div>

  <!-- Format tabs -->
  <div class="grid grid-cols-2 border border-black">
    <button
      type="button"
      class={tabClass(exportPrefs.lastFormat === 'png')}
      onclick={() => setFormat('png')}
    >
      Raster PNG
    </button>
    <button
      type="button"
      class="{tabClass(exportPrefs.lastFormat === 'svg')} border-l border-black"
      onclick={() => setFormat('svg')}
    >
      Vector SVG
    </button>
  </div>

  <!-- Format body -->
  {#if exportPrefs.lastFormat === 'png'}
    <PngExportSection
      busy={exportingFormat === 'png'}
      copied={copiedFormat === 'png'}
      onDownload={handlePngDownload}
      onCopy={handlePngCopy}
    />
  {:else}
    <SvgExportSection
      busy={exportingFormat === 'svg'}
      copied={copiedFormat === 'svg'}
      onDownload={handleSvgDownload}
      onCopy={handleSvgCopy}
    />
  {/if}

  <!-- Status -->
  {#if status}
    <p class="text-xs font-mono text-brutal-secondary">{status}</p>
  {/if}

  <!-- Reset -->
  <button
    type="button"
    class="self-start text-[10px] font-semibold uppercase tracking-wide text-brutal-secondary hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
    onclick={resetExportPrefs}
  >
    Reset export options
  </button>
</div>
