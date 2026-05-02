import createREGL from 'regl'
import type { SimParams } from './presets'
import quadVertSrc from './shaders/quad.vert?raw'
import simFragSrc from './shaders/simulation.frag?raw'
import displayFragSrc from './shaders/display.frag?raw'

export class GrayScott {
    private regl: any
    private width: number
    private height: number

    private pingTex: any
    private pongTex: any
    private pingFBO: any
    private pongFBO: any
    private ping = true // true = read from pingFBO, write to pongFBO

    private feedMapTex: any
    private killMapTex: any
    private colormapTex: any

    private simCmd: any
    private displayCmd: any

    constructor(canvas: HTMLCanvasElement, width: number, height: number) {
        this.width = width
        this.height = height

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
        this.pingTex = this.createFloatTexture(width, height)
        this.pongTex = this.createFloatTexture(width, height)
        this.pingFBO = this.regl.framebuffer({ color: this.pingTex, depthStencil: false })
        this.pongFBO = this.regl.framebuffer({ color: this.pongTex, depthStencil: false })

        // Create 1x1 param map placeholders
        this.feedMapTex = this.regl.texture({
            width: 1, height: 1,
            data: new Uint8Array([128, 0, 0, 255]),
            format: 'rgba', type: 'uint8',
            min: 'nearest', mag: 'nearest',
            wrap: 'clamp',
        })
        this.killMapTex = this.regl.texture({
            width: 1, height: 1,
            data: new Uint8Array([128, 0, 0, 255]),
            format: 'rgba', type: 'uint8',
            min: 'nearest', mag: 'nearest',
            wrap: 'clamp',
        })

        // Create 256x1 colormap texture (placeholder, white)
        const lutData = new Uint8Array(256 * 4)
        for (let i = 0; i < 256; i++) {
            lutData[i * 4 + 0] = 255
            lutData[i * 4 + 1] = 255
            lutData[i * 4 + 2] = 255
            lutData[i * 4 + 3] = 255
        }
        this.colormapTex = this.regl.texture({
            width: 256, height: 1,
            data: lutData,
            format: 'rgba', type: 'uint8',
            min: 'linear', mag: 'linear',
            wrap: 'clamp',
        })

        // Initialize state to A=1, B=0 everywhere
        this.clearState()

        // Build draw commands
        this.simCmd = this.createSimCommand()
        this.displayCmd = this.createDisplayCommand()
    }

    private createSimCommand(): any {
        return this.regl({
            vert: quadVertSrc,
            frag: simFragSrc,
            attributes: {
                position: [[-1, -1], [1, -1], [-1, 1], [-1, 1], [1, -1], [1, 1]],
            },
            uniforms: {
                u_state: this.regl.prop('u_state'),
                u_resolution: [this.width, this.height],
                u_feed: this.regl.prop('u_feed'),
                u_kill: this.regl.prop('u_kill'),
                u_da: this.regl.prop('u_da'),
                u_db: this.regl.prop('u_db'),
                u_dt: this.regl.prop('u_dt'),
                u_feedMap: this.feedMapTex,
                u_killMap: this.killMapTex,
                u_useParamMaps: false,
            },
            framebuffer: this.regl.prop('framebuffer'),
            count: 6,
            depth: { enable: false },
        })
    }

    private createDisplayCommand(): any {
        return this.regl({
            vert: quadVertSrc,
            frag: displayFragSrc,
            attributes: {
                position: [[-1, -1], [1, -1], [-1, 1], [-1, 1], [1, -1], [1, 1]],
            },
            uniforms: {
                u_state: this.regl.prop('u_state'),
                u_colormap: this.colormapTex,
                u_useLUT: this.regl.prop('u_useLUT'),
            },
            count: 6,
            depth: { enable: false },
        })
    }

    private createFloatTexture(width: number, height: number): any {
        return this.regl.texture({
            width, height,
            format: 'rgba',
            type: 'float',
            min: 'nearest',
            mag: 'nearest',
            wrap: 'clamp',
        })
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
        // Reinitialize textures with data using regl's texture(opts) call
        this.pingTex({
            width: this.width, height: this.height,
            data, format: 'rgba', type: 'float',
            min: 'nearest', mag: 'nearest', wrap: 'clamp',
        })
        this.pongTex({
            width: this.width, height: this.height,
            data, format: 'rgba', type: 'float',
            min: 'nearest', mag: 'nearest', wrap: 'clamp',
        })
        this.ping = true
    }

    /**
     * Replace current simulation state with a seed texture.
     * Black pixels (value <= 128) → A=0.5, B=0.25 (seeded reaction)
     * White pixels (value > 128) → A=1.0, B=0.0 (no reaction)
     */
    injectSeed(imageData: ImageData): void {
        const data = new Float32Array(this.width * this.height * 4)
        for (let i = 0; i < this.width * this.height; i++) {
            const brightness = imageData.data[i * 4]
            if (brightness <= 128) {
                data[i * 4 + 0] = 0.5   // A
                data[i * 4 + 1] = 0.25  // B
            } else {
                data[i * 4 + 0] = 1.0   // A
                data[i * 4 + 1] = 0.0   // B
            }
            data[i * 4 + 2] = 0.0
            data[i * 4 + 3] = 1.0
        }
        this.pingTex({
            width: this.width, height: this.height,
            data, format: 'rgba', type: 'float',
            min: 'nearest', mag: 'nearest', wrap: 'clamp',
        })
        this.pongTex({
            width: this.width, height: this.height,
            data, format: 'rgba', type: 'float',
            min: 'nearest', mag: 'nearest', wrap: 'clamp',
        })
        this.ping = true
    }

    /**
     * Inject seed from a Float32Array directly (from SeedGenerator.imageDataToSimState)
     */
    injectSeedFloat(data: Float32Array): void {
        this.pingTex({
            width: this.width, height: this.height,
            data, format: 'rgba', type: 'float',
            min: 'nearest', mag: 'nearest', wrap: 'clamp',
        })
        this.pongTex({
            width: this.width, height: this.height,
            data, format: 'rgba', type: 'float',
            min: 'nearest', mag: 'nearest', wrap: 'clamp',
        })
        this.ping = true
    }

    /**
     * Step the simulation N times per call
     */
    step(params: SimParams): void {
        const steps = Math.max(1, Math.min(16, Math.round(params.stepsPerFrame)))
        for (let i = 0; i < steps; i++) {
            const src = this.ping ? this.pingFBO : this.pongFBO
            const dst = this.ping ? this.pongFBO : this.pingFBO

            this.simCmd({
                u_state: src.color[0],
                u_feed: params.feed,
                u_kill: params.kill,
                u_da: params.da,
                u_db: params.db,
                u_dt: params.dt,
                framebuffer: dst,
            })

            this.ping = !this.ping
        }
    }

    /**
     * Render the current state to screen using the active colormap
     */
    render(useLUT: boolean): void {
        const current = this.ping ? this.pingFBO : this.pongFBO
        this.displayCmd({
            u_state: current.color[0],
            u_useLUT: useLUT,
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

        this.pingTex = this.createFloatTexture(width, height)
        this.pongTex = this.createFloatTexture(width, height)
        this.pingFBO = this.regl.framebuffer({ color: this.pingTex, depthStencil: false })
        this.pongFBO = this.regl.framebuffer({ color: this.pongTex, depthStencil: false })

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

        this.pingTex({
            width, height, data: newData,
            format: 'rgba', type: 'float',
            min: 'nearest', mag: 'nearest', wrap: 'clamp',
        })
        this.pongTex({
            width, height, data: newData,
            format: 'rgba', type: 'float',
            min: 'nearest', mag: 'nearest', wrap: 'clamp',
        })
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

    destroy(): void {
        this.pingTex.destroy()
        this.pongTex.destroy()
        this.pingFBO.destroy()
        this.pongFBO.destroy()
        this.feedMapTex.destroy()
        this.killMapTex.destroy()
        this.colormapTex.destroy()
        this.regl.destroy()
    }

    static createOffscreenContext(): any {
        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        const gl = canvas.getContext('webgl', {
            preserveDrawingBuffer: true,
            antialias: false,
        })
        if (!gl) return null

        const regl = createREGL({
            gl,
            extensions: ['OES_texture_float'],
            optionalExtensions: ['OES_texture_float_linear', 'OES_texture_half_float'],
        })

        return { regl, gl }
    }
}
