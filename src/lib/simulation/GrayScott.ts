import createREGL from 'regl'
import type { SimParams } from './presets'
import type { BoundaryMode } from '$lib/store/simStore.svelte'
import quadVertSrc from './shaders/quad.vert?raw'
import simFragSrc from './shaders/simulation.frag?raw'
import displayFragSrc from './shaders/display.frag?raw'

function isPowerOfTwo(n: number): boolean {
    return (n & (n - 1)) === 0 && n > 0
}

type ReglInstance = ReturnType<typeof createREGL>
type ReglTexture2D = ReturnType<ReglInstance['texture']>
type ReglFramebuffer2D = ReturnType<ReglInstance['framebuffer']>
// Framebuffer2D from regl types lacks the runtime `color` property
// (array of color attachment textures). Extend with what the code uses.
type ReglFBO = ReglFramebuffer2D & { color: ReglTexture2D[] }
// Draw commands use regl.prop() for dynamic property binding — their generic
// signatures can't be fully typed statically without replicating regl internals.
type ReglDrawCommand = any

export interface ContextCallbacks {
    onContextLost?: (e: Event) => void
    onContextRestored?: (e: Event) => void
}

export class GrayScott {
    private regl: ReglInstance
    private width: number
    private height: number

    private pingTex!: ReglTexture2D
    private pongTex!: ReglTexture2D
    private pingFBO!: ReglFBO
    private pongFBO!: ReglFBO
    private ping = true // true = read from pingFBO, write to pongFBO

    private boundaryMode: BoundaryMode = 'clamp'

    private feedMapTex: ReglTexture2D
    private killMapTex: ReglTexture2D
    private colormapTex: ReglTexture2D

    private simCmd: ReglDrawCommand
    private displayCmd: ReglDrawCommand

    private contextLostCallback: ((e: Event) => void) | null = null
    private contextRestoredCallback: ((e: Event) => void) | null = null
    private canvasEl: HTMLCanvasElement

    constructor(canvas: HTMLCanvasElement, width: number, height: number, callbacks?: ContextCallbacks) {
        this.width = width
        this.height = height
        this.canvasEl = canvas
        this.contextLostCallback = callbacks?.onContextLost ?? null
        this.contextRestoredCallback = callbacks?.onContextRestored ?? null

        canvas.addEventListener('webglcontextlost', this.handleContextLost as EventListener)
        canvas.addEventListener('webglcontextrestored', this.handleContextRestored as EventListener)

        // Force WebGL1 context so OES_texture_float extension is available.
        // In WebGL2, OES_texture_float returns null (it's core) but regl
        // still checks for it internally, causing a crash.
        const gl = canvas.getContext('webgl', {
            preserveDrawingBuffer: true,
            antialias: false,
        })
        if (!gl) {
            throw new Error('WebGL is not supported in this browser.')
        }

        this.regl = createREGL({
            gl,
            extensions: ['OES_texture_float'],
            optionalExtensions: ['OES_texture_float_linear', 'OES_texture_half_float'],
        })

        // Create ping-pong textures and framebuffers
        this.createPingPongFBOs()

        this.feedMapTex = this.createParamMapTexture()
        this.killMapTex = this.createParamMapTexture()
        this.colormapTex = this.createWhiteColormapTexture()

        // Initialize state to A=1, B=0 everywhere
        this.clearState()

        // Build draw commands
        this.simCmd = this.createSimCommand()
        this.displayCmd = this.createDisplayCommand()
    }

    private createSimCommand(): ReglDrawCommand {
        const regl = this.regl as any
        return regl({
            vert: quadVertSrc,
            frag: simFragSrc,
            attributes: {
                position: [[-1, -1], [1, -1], [-1, 1], [-1, 1], [1, -1], [1, 1]],
            },
            uniforms: {
                u_state: regl.prop('u_state'),
                u_pixelSize: [1.0 / this.width, 1.0 / this.height],
                u_feed: regl.prop('u_feed'),
                u_kill: regl.prop('u_kill'),
                u_da: regl.prop('u_da'),
                u_db: regl.prop('u_db'),
                u_dt: regl.prop('u_dt'),
                u_feedMap: this.feedMapTex,
                u_killMap: this.killMapTex,
                u_useParamMaps: false,
            },
            framebuffer: regl.prop('framebuffer'),
            count: 6,
            depth: { enable: false },
        })
    }

    private createDisplayCommand(): ReglDrawCommand {
        const regl = this.regl as any
        return regl({
            vert: quadVertSrc,
            frag: displayFragSrc,
            attributes: {
                position: [[-1, -1], [1, -1], [-1, 1], [-1, 1], [1, -1], [1, 1]],
            },
            uniforms: {
                u_state: regl.prop('u_state'),
                u_colormap: this.colormapTex,
            },
            count: 6,
            depth: { enable: false },
        })
    }

    private effectiveWrap(mode: BoundaryMode): BoundaryMode {
        return mode !== 'clamp' && (!isPowerOfTwo(this.width) || !isPowerOfTwo(this.height)) ? 'clamp' : mode
    }

    private uploadFloatData(tex: ReglTexture2D, w: number, h: number, data: Float32Array, wrap: BoundaryMode): void {
        tex({ width: w, height: h, data, format: 'rgba', type: 'float', min: 'nearest', mag: 'nearest', wrap })
    }

    private createPingPongFBOs(wrap?: BoundaryMode): void {
        this.pingTex = this.createFloatTexture(this.width, this.height, wrap)
        this.pongTex = this.createFloatTexture(this.width, this.height, wrap)
        this.pingFBO = this.regl.framebuffer({ color: this.pingTex, depthStencil: false }) as ReglFBO
        this.pongFBO = this.regl.framebuffer({ color: this.pongTex, depthStencil: false }) as ReglFBO
    }

    private createFloatTexture(width: number, height: number, wrap?: BoundaryMode): ReglTexture2D {
        const mode: BoundaryMode = wrap ?? this.boundaryMode
        const resolved = mode !== 'clamp' && (!isPowerOfTwo(width) || !isPowerOfTwo(height)) ? 'clamp' : mode
        return this.regl.texture({
            width, height,
            format: 'rgba',
            type: 'float',
            min: 'nearest',
            mag: 'nearest',
            wrap: resolved,
        })
    }

    private createParamMapTexture(): ReglTexture2D {
        return this.regl.texture({
            width: 1, height: 1,
            data: new Uint8Array([128, 0, 0, 255]),
            format: 'rgba', type: 'uint8',
            min: 'nearest', mag: 'nearest',
            wrap: 'clamp',
        })
    }

    private createWhiteColormapTexture(): ReglTexture2D {
        const lutData = new Uint8Array(256 * 4)
        for (let i = 0; i < 256; i++) {
            lutData[i * 4 + 0] = 255
            lutData[i * 4 + 1] = 255
            lutData[i * 4 + 2] = 255
            lutData[i * 4 + 3] = 255
        }
        return this.regl.texture({
            width: 256, height: 1,
            data: lutData,
            format: 'rgba', type: 'uint8',
            min: 'linear', mag: 'linear',
            wrap: 'clamp',
        })
    }

    public setBoundaryMode(mode: BoundaryMode): void {
        let resolved = this.effectiveWrap(mode)
        if (resolved === this.boundaryMode) return

        const state = this.readStateFloat()

        this.pingTex.destroy()
        this.pongTex.destroy()
        this.pingFBO.destroy()
        this.pongFBO.destroy()

        try {
            this.createPingPongFBOs(resolved)
        } catch (e) {
            if (resolved !== 'clamp') {
                resolved = 'clamp'
                this.createPingPongFBOs('clamp')
            } else {
                throw e
            }
        }

        const wrap = resolved
        this.uploadFloatData(this.pingTex, this.width, this.height, state, wrap)
        this.uploadFloatData(this.pongTex, this.width, this.height, state, wrap)
        this.ping = true
        this.boundaryMode = resolved
        this.simCmd = this.createSimCommand()
    }

    public clearState(): void {
        // Initialize: A=1, B=0 everywhere
        const data = new Float32Array(this.width * this.height * 4)
        for (let i = 0; i < this.width * this.height; i++) {
            data[i * 4 + 0] = 1.0 // A
            data[i * 4 + 1] = 0.0 // B
            data[i * 4 + 2] = 0.0
            data[i * 4 + 3] = 1.0
        }
        this.injectSeedFloat(data)
    }

    /**
     * Inject seed from a Float32Array directly (from SeedGenerator.imageDataToSimState)
     */
    injectSeedFloat(data: Float32Array): void {
        const wrap = this.effectiveWrap(this.boundaryMode)
        this.uploadFloatData(this.pingTex, this.width, this.height, data, wrap)
        this.uploadFloatData(this.pongTex, this.width, this.height, data, wrap)
        this.ping = true
    }

    /**
     * Step the simulation N times per call.
     * Ping-pong loop unrolled to reduce JS overhead and branch mispredictions.
     */
    step(params: SimParams, steps?: number): void {
        // Caller passes pre-clamped value; avoid re-clamping every frame.
        const n = steps ?? Math.max(1, Math.min(16, Math.round(params.stepsPerFrame)));
        const feed = params.feed;
        const kill = params.kill;
        const da = params.da;
        const db = params.db;
        const dt = params.dt;

        let ping = this.ping;
        for (let i = 0; i < n; i++) {
            const src = ping ? this.pingFBO : this.pongFBO;
            const dst = ping ? this.pongFBO : this.pingFBO;

            this.simCmd({
                u_state: (src as ReglFBO).color[0],
                u_feed: feed,
                u_kill: kill,
                u_da: da,
                u_db: db,
                u_dt: dt,
                framebuffer: dst,
            });

            ping = !ping;
        }
        this.ping = ping;
    }

    /**
     * Render the current state to screen using the active colormap
     */
    render(): void {
        const current = this.ping ? this.pingFBO : this.pongFBO
        this.displayCmd({
            u_state: current.color[0],
        })
    }

    /**
     * Upload a new colormap LUT (256x4 Uint8Array)
     */
    uploadColormap(lutData: Uint8Array): void {
        this.colormapTex.subimage({
            width: 256,
            height: 1,
            data: lutData,
        })
    }

    /**
     * Resize the simulation grid, preserving existing state.
     * Old data is placed at top-left; new regions filled with A=1, B=0.
     */
    resize(width: number, height: number): void {
        const oldW = this.width
        const oldH = this.height

        // Read current state from the active FBO
        const current = this.ping ? this.pingFBO : this.pongFBO
        const oldData = new Float32Array(oldW * oldH * 4)
        current.use(() => {
            this.regl.read({ data: oldData })
        })

        this.width = width
        this.height = height

        // Recreate textures and FBOs at new size
        this.pingTex.destroy()
        this.pongTex.destroy()
        this.pingFBO.destroy()
        this.pongFBO.destroy()

        this.createPingPongFBOs()

        // Build new data: copy old pixels into the center, fill rest with A=1, B=0
        const newData = new Float32Array(width * height * 4)
        const offsetX = Math.floor((width - oldW) / 2)
        const offsetY = Math.floor((height - oldH) / 2)

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const ni = (y * width + x) * 4
                const oldX = x - offsetX
                const oldY = y - offsetY

                if (oldX >= 0 && oldX < oldW && oldY >= 0 && oldY < oldH) {
                    const oi = (oldY * oldW + oldX) * 4
                    newData[ni + 0] = oldData[oi + 0]
                    newData[ni + 1] = oldData[oi + 1]
                    newData[ni + 2] = oldData[oi + 2]
                    newData[ni + 3] = oldData[oi + 3]
                } else {
                    newData[ni + 0] = 1.0 // A
                    newData[ni + 1] = 0.0 // B
                    newData[ni + 2] = 0.0
                    newData[ni + 3] = 1.0
                }
            }
        }

        const wrap = this.effectiveWrap(this.boundaryMode)
        this.uploadFloatData(this.pingTex, width, height, newData, wrap)
        this.uploadFloatData(this.pongTex, width, height, newData, wrap)
        this.ping = true

        // Recreate sim command with new resolution
        this.simCmd = this.createSimCommand()

        // Tell REGL to re-read canvas dimensions for the default viewport
        this.regl.poll()
    }

    /**
     * Read current state as Uint8Array for export (RGBA 8-bit).
     * Reads float data from FBO then converts to 0-255 range.
     */
    readPixels(): Uint8Array {
        const current = this.ping ? this.pingFBO : this.pongFBO
        const floatPixels = new Float32Array(this.width * this.height * 4)

        current.use(() => {
            this.regl.read({ data: floatPixels })
        })

        // Convert float [0,1] → uint8 [0,255]
        const pixels = new Uint8Array(this.width * this.height * 4)
        for (let i = 0; i < floatPixels.length; i++) {
            pixels[i] = Math.round(Math.min(1, Math.max(0, floatPixels[i])) * 255)
        }
        return pixels
    }

    /**
     * Read current simulation state as float texture data.
     */
    readStateFloat(): Float32Array {
        const current = this.ping ? this.pingFBO : this.pongFBO
        const state = new Float32Array(this.width * this.height * 4)
        current.use(() => {
            this.regl.read({ data: state })
        })
        return state
    }

    /**
     * Replace current simulation state from float texture data.
     */
    writeStateFloat(data: Float32Array): void {
        this.injectSeedFloat(data)
    }

    getWidth(): number {
        return this.width
    }

    getHeight(): number {
        return this.height
    }

    getCanvasElement(): HTMLCanvasElement {
        return this.canvasEl
    }

    private handleContextLost = (e: Event) => {
        e.preventDefault()
        this.contextLostCallback?.(e)
    }

    private handleContextRestored = (e: Event) => {
        this.createPingPongFBOs()

        this.feedMapTex = this.createParamMapTexture()
        this.killMapTex = this.createParamMapTexture()
        this.colormapTex = this.createWhiteColormapTexture()

        this.clearState()
        this.simCmd = this.createSimCommand()
        this.displayCmd = this.createDisplayCommand()

        this.contextRestoredCallback?.(e)
    }

    destroy(): void {
        this.canvasEl.removeEventListener('webglcontextlost', this.handleContextLost as EventListener)
        this.canvasEl.removeEventListener('webglcontextrestored', this.handleContextRestored as EventListener)
        this.pingTex.destroy()
        this.pongTex.destroy()
        this.pingFBO.destroy()
        this.pongFBO.destroy()
        this.feedMapTex.destroy()
        this.killMapTex.destroy()
        this.colormapTex.destroy()
        this.regl.destroy()
    }
}
