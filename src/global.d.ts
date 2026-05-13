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

declare module 'potrace-plus' {
    interface PathCommand {
        command: string
        args: number[]
    }

    interface TracedResult {
        readonly svg: string
        readonly svgSplit: string
        readonly d: string
        readonly pathData: PathCommand[]
        readonly pathDataNorm: PathCommand[]
        readonly width: number
        readonly height: number
        getSVG(split?: boolean): string
        getD(): string
        getPathData(): PathCommand[]
        getPathDataNorm(): PathCommand[]
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
        useWorker?: boolean
    }

    export function PotracePlus(
        source: Blob | HTMLImageElement | HTMLCanvasElement | HTMLSvgElement | string,
        options?: PotracePlusOptions
    ): Promise<TracedResult>
}
