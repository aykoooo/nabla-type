/**
 * Build deterministic, filesystem-safe export filenames from simulation state.
 *
 * Priorities, per final design:
 *   - Seed text is the primary name.
 *   - No hardcoded product prefix.
 *   - Optional tokens: font, resolution, timestamp, iteration, feed, kill.
 */

export interface FilenameContext {
  seedText: string
  fontName: string
  width: number
  height: number
  feed: number
  kill: number
  iteration: number
}

export interface FilenameOptions {
  includeSeed?: boolean
  includeFont?: boolean
  includeResolution?: boolean
  includeTimestamp?: boolean
  includeIteration?: boolean
  includeFeed?: boolean
  includeKill?: boolean
}

const MAX_SEED_SLUG = 24
const MAX_FONT_SLUG = 20
const MAX_TOTAL_LENGTH = 200
const FALLBACK_NAME = 'untitled'

export function buildFilename(
  ext: 'png' | 'svg',
  ctx: FilenameContext,
  opts: FilenameOptions,
): string {
  const parts: string[] = []

  if (opts.includeSeed) {
    const seed = slugify(ctx.seedText, MAX_SEED_SLUG)
    if (seed) parts.push(seed)
  }

  if (opts.includeFont) {
    const font = slugify(ctx.fontName, MAX_FONT_SLUG)
    parts.push(font || 'default')
  }

  if (opts.includeResolution) {
    parts.push(`${ctx.width}x${ctx.height}`)
  }

  if (opts.includeTimestamp) {
    parts.push(timestampSlug())
  }

  if (opts.includeIteration) {
    parts.push(`i${Math.max(0, Math.floor(ctx.iteration))}`)
  }

  if (opts.includeFeed) {
    parts.push(`f${trimFloat(ctx.feed)}`)
  }

  if (opts.includeKill) {
    parts.push(`k${trimFloat(ctx.kill)}`)
  }

  let name = parts.join('-')
  if (!name) name = FALLBACK_NAME
  if (name.length > MAX_TOTAL_LENGTH) {
    name = name.slice(0, MAX_TOTAL_LENGTH)
  }

  name = name.replace(/^-+|[-]+$/g, '').replace(/-+/g, '-')
  if (!name) name = FALLBACK_NAME

  return `${name}.${ext}`
}

function slugify(input: string, maxLen: number): string {
  let s = (input ?? '').trim().toLowerCase()
  s = s.replace(/[^\w\s-]+/g, '')
  s = s.replace(/\s+/g, '-')
  s = s.replace(/-+/g, '-')
  s = s.replace(/^-+|-+$/g, '')
  if (s.length > maxLen) s = s.slice(0, maxLen)
  return s
}

function timestampSlug(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  )
}

function trimFloat(n: number): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return '0'
  return n.toFixed(4).replace(/\.?0+$/, '')
}
