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
      includeSeed: typeof rf?.includeSeed === 'boolean' ? rf.includeSeed : DEFAULTS.filename.includeSeed,
      includeFont: typeof rf?.includeFont === 'boolean' ? rf.includeFont : DEFAULTS.filename.includeFont,
      includeResolution: typeof rf?.includeResolution === 'boolean' ? rf.includeResolution : DEFAULTS.filename.includeResolution,
      includeTimestamp: typeof rf?.includeTimestamp === 'boolean' ? rf.includeTimestamp : DEFAULTS.filename.includeTimestamp,
      includeIteration: typeof rf?.includeIteration === 'boolean' ? rf.includeIteration : DEFAULTS.filename.includeIteration,
      includeFeed: typeof rf?.includeFeed === 'boolean' ? rf.includeFeed : DEFAULTS.filename.includeFeed,
      includeKill: typeof rf?.includeKill === 'boolean' ? rf.includeKill : DEFAULTS.filename.includeKill,
    },
    png: {
      scale: typeof rp?.scale === 'number' ? rp.scale : DEFAULTS.png.scale,
    },
    svg: {
      threshold: typeof rs?.threshold === 'number' ? rs.threshold : DEFAULTS.svg.threshold,
      padding: typeof rs?.padding === 'number' ? rs.padding : DEFAULTS.svg.padding,
      splitPaths: typeof rs?.splitPaths === 'boolean' ? rs.splitPaths : DEFAULTS.svg.splitPaths,
      turdsize: typeof rs?.turdsize === 'number' ? rs.turdsize : DEFAULTS.svg.turdsize,
      alphamax: typeof rs?.alphamax === 'number' ? rs.alphamax : DEFAULTS.svg.alphamax,
      opttolerance: typeof rs?.opttolerance === 'number' ? rs.opttolerance : DEFAULTS.svg.opttolerance,
      optcurve: typeof rs?.optcurve === 'boolean' ? rs.optcurve : DEFAULTS.svg.optcurve,
      includeMetadata: typeof rs?.includeMetadata === 'boolean' ? rs.includeMetadata : DEFAULTS.svg.includeMetadata,
      includeFontInMetadata: typeof rs?.includeFontInMetadata === 'boolean' ? rs.includeFontInMetadata : DEFAULTS.svg.includeFontInMetadata,
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
