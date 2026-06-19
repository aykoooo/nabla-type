/**
 * SVG export pipeline.
 *
 *   sim.readPixels() → prepareBinaryMask() → tracingService.trace() → SVG string
 *
 * potrace-plus runs on a Worker when available (auto-detected by the library).
 */

import { tracingService } from '$lib/tracing/TracingService'
import type { TracingParams } from '$lib/tracing/types'

export { tracingService }
export type { TracingParams }

// ---- mask preparation ------------------------------------------------------

export interface BinaryMaskOptions {
    threshold?: number
    yFlip?: boolean
    contrastStretch?: boolean
}

/**
 * Convert raw RGBA pixels into binary monochrome ImageData ready for potrace.
 *
 * Merges Y-flip, contrast-stretch, threshold, and invert into a single pass
 * to eliminate intermediate allocations and redundant iteration.
 *
 * Reads the G channel because the display shader writes chemical B to green.
 *
 * Potrace expects black (#000) foreground on white (#FFF) background.
 * Our simulation outputs white filaments on a dark background, so we
 * always invert here.
 */
export function prepareBinaryMask(
    pixels: Uint8Array,
    width: number,
    height: number,
    opts: BinaryMaskOptions = {},
): ImageData {
    const { threshold = 48, yFlip = false, contrastStretch = false } = opts
    const pixelCount = width * height
    const len = pixelCount * 4

    // Read chemical-B value from the G channel (display shader writes b to green)
    let minV = 255
    let maxV = 0

    // Optional contrast-stretch pass: find min/max
    if (contrastStretch) {
        for (let i = 0; i < pixelCount; i++) {
            const v = pixels[i * 4 + 1]
            if (v < minV) minV = v
            if (v > maxV) maxV = v
        }
    }

    const range = contrastStretch ? Math.max(1, maxV - minV) : 1
    const dst = new Uint8ClampedArray(len)

    // Single merged pass: Y-flip (optional) + stretch (optional) + threshold + invert
    for (let y = 0; y < height; y++) {
        const srcRow = yFlip ? (height - 1 - y) : y
        for (let x = 0; x < width; x++) {
            let v = pixels[(srcRow * width + x) * 4 + 1]

            if (contrastStretch) {
                v = Math.round(((v - minV) / range) * 255)
            }

            // Binary threshold
            v = v >= threshold ? 255 : 0

            // Invert — potrace traces black as foreground
            v = 255 - v

            const dstIdx = (y * width + x) * 4
            dst[dstIdx] = v
            dst[dstIdx + 1] = v
            dst[dstIdx + 2] = v
            dst[dstIdx + 3] = 255
        }
    }

    return new ImageData(dst, width, height)
}

// ---- SVG generation ---------------------------------------------------------

export interface ExportMetadata {
    seed?: string
    fontName?: string
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
    split?: boolean
    metadata?: ExportMetadata
    includeMetadata?: boolean
}

export async function renderSVG(
    imageData: ImageData,
    params: TracingParams,
    opts: ExportOptions = {},
): Promise<string> {
    const result = await tracingService.trace(imageData, params)
    const rawSvg = opts.split ? result.svgSplit : result.svg
    return applyEnvelope(rawSvg, opts)
}

function applyEnvelope(svgString: string, opts: ExportOptions): string {
    const pad = opts.padding ?? 16
    const includeMeta = opts.includeMetadata ?? true
    const meta = includeMeta ? buildMetadata(opts.metadata) : []

    if (!pad && !opts.svgWidth && !opts.svgHeight) {
        return injectMetadata(svgString, meta)
    }

    const vbMatch = svgString.match(/viewBox="([^"]*)"/)
    const oldVb = vbMatch ? vbMatch[1].split(/\s+/).map(Number) : [0, 0, 512, 512]
    const [, , ow, oh] = oldVb

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

function buildMetadata(m?: ExportMetadata): string[] {
    if (!m) return []
    const L: string[] = ['<!-- Generated in nabla-type -->']
    if (m.seed) L.push(`<!-- Seed: ${sanitizeXml(m.seed)} -->`)
    if (m.fontName) L.push(`<!-- Font: ${sanitizeXml(m.fontName)} -->`)
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

function sanitizeXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/-->/g, '--&gt;')
}

function injectMetadata(svg: string, meta: string[]): string {
    if (!meta.length) return svg
    const xmlIdx = svg.indexOf('?>')
    if (xmlIdx !== -1) {
        return svg.slice(0, xmlIdx + 2) + '\n' + meta.join('\n') + svg.slice(xmlIdx + 2)
    }
    return meta.join('\n') + '\n' + svg
}
