/**
 * SVG export pipeline.
 *
 *   sim.readPixels() → prepareBinaryMask() → tracingService.trace() → SVG string
 *
 * potrace-plus runs on the main thread (references DOM types internally).
 */

import { tracingService } from '$lib/tracing/TracingService'
import type { TracingParams } from '$lib/tracing/types'

export { tracingService }
export type { TracingParams }

// ---- mask preparation ------------------------------------------------------

/**
 * Convert raw RGBA pixels (grayscale, one channel replicated) into binary
 * monochrome ImageData ready for potrace.
 *
 * Potrace expects black (#000) foreground on white (#FFF) background.
 * Our simulation outputs white filaments on a dark background, so we
 * always invert here.
 */
export function prepareBinaryMask(
    pixels: Uint8Array,
    width: number,
    height: number,
    threshold = 48,
): ImageData {
    const len = width * height * 4
    const buf = pixels.buffer.slice(pixels.byteOffset, pixels.byteOffset + len)
    const src = new Uint8ClampedArray(buf)
    const dst = new Uint8ClampedArray(len)

    for (let i = 0; i < len; i += 4) {
        let v = src[i]

        // Binary threshold
        v = v >= threshold ? 255 : 0

        // Invert — potrace traces black as foreground
        v = 255 - v

        dst[i] = v
        dst[i + 1] = v
        dst[i + 2] = v
        dst[i + 3] = 255
    }

    return new ImageData(dst, width, height)
}

// ---- SVG generation ---------------------------------------------------------

export interface ExportMetadata {
    seed?: string
    timestamp: string
    resolution: { width: number; height: number }
    iterations: number
    simParams: { feed: number; kill: number; da: number; db: number; dt: number }
    tracingParams: TracingParams
}

export interface ExportOptions {
    padding?: number
    svgWidth?: number
    svgHeight?: number
    /** Use individual <path> elements per shape group instead of one compound path */
    split?: boolean
    /** Embedded XML comments with generation metadata */
    metadata?: ExportMetadata
}

/**
 * Trace the given binary ImageData and build a polished SVG envelope.
 */
export async function renderSVG(
    imageData: ImageData,
    params: TracingParams,
    opts: ExportOptions = {},
): Promise<string> {
    const result = await tracingService.trace(imageData, params)

    // potrace-plus already returns complete <svg> elements.
    // Choose compound or split based on user preference.
    const rawSvg = opts.split ? result.svgSplit : result.svg
    return applyEnvelope(rawSvg, opts)
}

/**
 * Post-process potrace-plus SVG output:
 *  - Inject metadata comments after <?xml?>
 *  - Adjust viewBox to include uniform padding
 *  - Optionally change width / height attributes
 */
function applyEnvelope(svgString: string, opts: ExportOptions): string {
    const pad = opts.padding ?? 16
    const meta = buildMetadata(opts.metadata)

    // Without padding or custom dims, just inject metadata
    if (!pad && !opts.svgWidth && !opts.svgHeight) {
        return injectMetadata(svgString, meta)
    }

    // Extract existing viewBox
    const vbMatch = svgString.match(/viewBox="([^"]*)"/)
    const oldVb = vbMatch ? vbMatch[1].split(/\s+/).map(Number) : [0, 0, 512, 512]
    const [, , ow, oh] = oldVb

    // For split SVG, extract all <path d="..."/> matches
    const pathMatches = [...svgString.matchAll(/<path[^>]*d="([^"]*)"[^>]*\/>/g)]
    const paths = pathMatches.map(m => m[1])

    const w = opts.svgWidth ?? ow
    const h = opts.svgHeight ?? oh
    const vbW = w + pad * 2
    const vbH = h + pad * 2

    let content = ''
    for (const d of paths) {
        content += `<path d="${d}" fill="#000000" stroke="none" fill-rule="evenodd"/>\n`
    }

    return [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        ...meta,
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${vbW} ${vbH}" width="${vbW}" height="${vbH}">`,
        content.trimEnd(),
        `</svg>`,
    ].join('\n')
}

/** Build metadata comment lines */
function buildMetadata(m?: ExportMetadata): string[] {
    if (!m) return []
    const L: string[] = ['<!-- Generated in nabla-type -->']
    if (m.seed) L.push(`<!-- Seed: ${sanitizeXml(m.seed)} -->`)
    L.push(`<!-- Exported: ${m.timestamp} -->`)
    L.push(`<!-- Resolution: ${m.resolution.width}×${m.resolution.height} -->`)
    L.push(`<!-- Iterations: ${m.iterations} -->`)
    L.push(`<!-- Feed rate: ${m.simParams.feed.toFixed(4)} -->`)
    L.push(`<!-- Kill rate: ${m.simParams.kill.toFixed(4)} -->`)
    L.push(`<!-- Diffusion A: ${m.simParams.da.toFixed(4)} -->`)
    L.push(`<!-- Diffusion B: ${m.simParams.db.toFixed(4)} -->`)
    L.push(`<!-- dt: ${m.simParams.dt.toFixed(4)} -->`)
    L.push(`<!-- turdsize: ${m.tracingParams.turdsize}  alphamax: ${m.tracingParams.alphamax.toFixed(2)}  opttolerance: ${m.tracingParams.opttolerance.toFixed(2)}  optcurve: ${m.tracingParams.optcurve} -->`)
    return L
}

/** Strip characters that could break XML or inject script */
function sanitizeXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/-->/g, '--&gt;')
}

/** Insert metadata comments between <?xml?> and <svg> */
function injectMetadata(svg: string, meta: string[]): string {
    if (!meta.length) return svg
    // If there's an xml declaration, insert after it; otherwise prepend
    const xmlIdx = svg.indexOf('?>')
    if (xmlIdx !== -1) {
        return svg.slice(0, xmlIdx + 2) + '\n' + meta.join('\n') + svg.slice(xmlIdx + 2)
    }
    return meta.join('\n') + '\n' + svg
}