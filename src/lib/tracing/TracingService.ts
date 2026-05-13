/**
 * TracingService — thin async wrapper around PotracePlus.
 * Runs on the main thread (library references DOM types like HTMLImageElement).
 */

import { PotracePlus } from 'potrace-plus'
import type { TracingParams, TraceResult, PathCommand } from './types'

export class TracingService {
    /**
     * Trace the supplied binary ImageData with the given potrace-plus params.
     */
    async trace(imageData: ImageData, params: TracingParams): Promise<TraceResult> {
        // Draw to a real canvas (main thread = DOM available)
        const canvas = document.createElement('canvas')
        canvas.width = imageData.width
        canvas.height = imageData.height
        const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true })
        if (!ctx) throw new Error('Cannot get 2D context')

        ctx.putImageData(imageData, 0, 0)

        // potrace-plus processes the canvas directly
        const traced = await PotracePlus(canvas, {
            turdsize: params.turdsize,
            alphamax: params.alphamax,
            opttolerance: params.opttolerance,
            optcurve: params.optcurve,
            turnpolicy: params.turnpolicy,

            useWorker: false,
            optimize: true,
            crop: false,
            decimals: 2,
            addDimensions: false,
            toRelative: false,
            toShorthands: false,
            getPolygon: false,
            getPDF: false,
        })

        return {
            svg: traced.svg ?? '',
            svgSplit: traced.svgSplit ?? '',
            pathDataNorm: (traced.pathData as unknown as PathCommand[]) ?? [],
            width: traced.width as number,
            height: traced.height as number,
        }
    }

    }

/** Shared singleton */
export const tracingService = new TracingService()