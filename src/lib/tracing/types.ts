/**
 * Core type definitions for the tracing pipeline.
 * potrace-plus → path data → SVG / UFO / node editing.
 */

/** Parameters forwarded to potrace-plus */
export interface TracingParams {
    turdsize: number
    alphamax: number
    opttolerance: number
    optcurve: boolean
    turnpolicy: 'minority' | 'majority' | 'left' | 'right' | 'black' | 'white'
}

/** SVG path command object (matches SVGPathData spec) */
export interface PathCommand {
    command: string   // 'M', 'L', 'C', 'Q', 'Z', 'H', 'V', 'S', 'T', 'A'
    args: number[]
}

/** Result returned from the tracing worker */
export interface TraceResult {
    svg: string             // Full compound-path SVG from potrace-plus
    svgSplit: string        // Split SVG (separate <path> per shape group)
    pathDataNorm: PathCommand[]  // Normalised path data (absolute coords, cubic Bézier)
    width: number
    height: number
}

/** A single closed or open contour extracted from path data */
export interface Contour {
    /** Flat array of on-curve points with off-curve control points interspersed */
    commands: PathCommand[]
    /** Winding direction ― true when reversed (hole) */
    isHole: boolean
}

/** Axis-aligned bounding box */
export interface BBox {
    x: number
    y: number
    width: number
    height: number
}