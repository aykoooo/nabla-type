/// <reference types="svelte" />
/// <reference types="vite/client" />

declare module '*.vert?raw' {
    const src: string
    export default src
}

declare module '*.frag?raw' {
    const src: string
    export default src
}

declare module 'regl' {
    const createREGL: any
    export default createREGL
    export type Regl = any
    export type Framebuffer2D = any
    export type Texture2D = any
    export type DrawCommand = any
}

declare module 'potrace-plus' {
    interface TracedResult {
        readonly svg: string
        readonly svgSplit: string
        readonly d: string
        readonly width: number
        readonly height: number
        readonly commands: number
        getSVG(split?: boolean): string
        getD(): string
        getPathData(): unknown[]
        getPathDataNorm(): unknown[]
    }

    interface PotracePlusOptions {
        turdsize?: number
        alphamax?: number
        opttolerance?: number
        optcurve?: boolean
        turnpolicy?: string
        optimize?: boolean
        crop?: boolean
        decimals?: number
        addDimensions?: boolean
        toRelative?: boolean
        toShorthands?: boolean
        getPolygon?: boolean
        getPDF?: boolean
    }

    export function PotracePlus(
        source: Blob | HTMLImageElement | HTMLCanvasElement | HTMLSvgElement | string,
        options?: PotracePlusOptions
    ): Promise<TracedResult>

    // Internal utilities re-exported (unused by us)
    export var Bitmap: unknown
}

declare module 'opentype.js' {
    const opentype: any
    export default opentype
    export type Font = any
}

declare module 'd3-contour' {
    export function contours(): any
}
