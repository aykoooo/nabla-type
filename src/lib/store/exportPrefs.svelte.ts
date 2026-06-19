/**
 * Per-user export preferences.
 *
 * Stored in localStorage and deeply reactive via Svelte 5 runes.
 * All defaults are chosen to keep the exported artifact named after the
 * seed text first, with common provenance tokens optional.
 */

export interface ExportFilenamePrefs {
  includeSeed: boolean
  includeFont: boolean
  includeResolution: boolean
  includeTimestamp: boolean
  includeIteration: boolean
  includeFeed: boolean
  includeKill: boolean
}

export interface ExportFormatPrefs {
  lastFormat: 'png' | 'svg'
  filename: ExportFilenamePrefs
  png: {
    scale: number
  }
  svg: {
    threshold: number
    padding: number
    splitPaths: boolean
    turdsize: number
    alphamax: number
    opttolerance: number
    optcurve: boolean
    includeMetadata: boolean
    includeFontInMetadata: boolean
  }
}

const STORAGE_KEY = 'nabla-type-export-prefs'

const DEFAULTS: ExportFormatPrefs = {
  lastFormat: 'png',
  filename: {
    includeSeed: true,
    includeFont: true,
    includeResolution: true,
    includeTimestamp: false,
    includeIteration: false,
    includeFeed: false,
    includeKill: false,
  },
  png: {
    scale: 1,
  },
  svg: {
    threshold: 48,
    padding: 12,
    splitPaths: false,
    turdsize: 2,
    alphamax: 0.9,
    opttolerance: 0.2,
    optcurve: true,
    includeMetadata: true,
    includeFontInMetadata: true,
  },
}

function load(): ExportFormatPrefs {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return mergePrefs(JSON.parse(raw))
  } catch (e) {
    console.warn('[exportPrefs] Failed to load prefs:', e)
    return DEFAULTS
  }
}

function mergePrefs(raw: unknown): ExportFormatPrefs {
  const r = raw as Record<string, unknown> | undefined
  const rf = r?.filename as Record<string, unknown> | undefined
  const rp = r?.png as Record<string, unknown> | undefined
  const rs = r?.svg as Record<string, unknown> | undefined

  return {
    lastFormat: r?.lastFormat === 'svg' ? 'svg' : 'png',
    filename: {
      includeSeed: (rf?.includeSeed as boolean | undefined) ?? DEFAULTS.filename.includeSeed,
      includeFont: (rf?.includeFont as boolean | undefined) ?? DEFAULTS.filename.includeFont,
      includeResolution: (rf?.includeResolution as boolean | undefined) ?? DEFAULTS.filename.includeResolution,
      includeTimestamp: (rf?.includeTimestamp as boolean | undefined) ?? DEFAULTS.filename.includeTimestamp,
      includeIteration: (rf?.includeIteration as boolean | undefined) ?? DEFAULTS.filename.includeIteration,
      includeFeed: (rf?.includeFeed as boolean | undefined) ?? DEFAULTS.filename.includeFeed,
      includeKill: (rf?.includeKill as boolean | undefined) ?? DEFAULTS.filename.includeKill,
    },
    png: {
      scale: (rp?.scale as number | undefined) ?? DEFAULTS.png.scale,
    },
    svg: {
      threshold: (rs?.threshold as number | undefined) ?? DEFAULTS.svg.threshold,
      padding: (rs?.padding as number | undefined) ?? DEFAULTS.svg.padding,
      splitPaths: (rs?.splitPaths as boolean | undefined) ?? DEFAULTS.svg.splitPaths,
      turdsize: (rs?.turdsize as number | undefined) ?? DEFAULTS.svg.turdsize,
      alphamax: (rs?.alphamax as number | undefined) ?? DEFAULTS.svg.alphamax,
      opttolerance: (rs?.opttolerance as number | undefined) ?? DEFAULTS.svg.opttolerance,
      optcurve: (rs?.optcurve as boolean | undefined) ?? DEFAULTS.svg.optcurve,
      includeMetadata: (rs?.includeMetadata as boolean | undefined) ?? DEFAULTS.svg.includeMetadata,
      includeFontInMetadata: (rs?.includeFontInMetadata as boolean | undefined) ?? DEFAULTS.svg.includeFontInMetadata,
    },
  }
}

const _exportPrefs = $state<ExportFormatPrefs>(load())
export const exportPrefs = _exportPrefs

let persistTimeout: ReturnType<typeof setTimeout> | null = null

export function schedulePersistExportPrefs() {
  if (persistTimeout) clearTimeout(persistTimeout)
  persistTimeout = setTimeout(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(_exportPrefs))
    } catch (e) {
      console.warn('[exportPrefs] Failed to persist prefs:', e)
    }
  }, 300)
}

export function resetExportPrefs() {
  const d = DEFAULTS
  _exportPrefs.lastFormat = d.lastFormat
  _exportPrefs.filename = { ...d.filename }
  _exportPrefs.png = { ...d.png }
  _exportPrefs.svg = { ...d.svg }
  schedulePersistExportPrefs()
}
