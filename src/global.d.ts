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

declare module 'vtracer-webapp' {
    export function trace(data: Uint8Array, options?: any): string
}

declare module 'opentype.js' {
    const opentype: any
    export default opentype
    export type Font = any
}

declare module 'd3-contour' {
    export function contours(): any
}
