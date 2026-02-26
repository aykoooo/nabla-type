/**
 * SVGExporter — VTracer WASM wrapper that runs in a Web Worker.
 *
 * Main thread sends thresholded pixel data → worker traces it → returns SVG string.
 * VTracer WASM is never loaded on the main thread.
 */
export class SVGExporter {
    private worker: Worker | null = null

    private getWorker(): Worker {
        if (!this.worker) {
            this.worker = new Worker(
                new URL('./svgWorker.ts', import.meta.url),
                { type: 'module' }
            )
        }
        return this.worker
    }

    /**
     * Trace a thresholded pixel buffer into an SVG string.
     * Runs VTracer WASM in a Web Worker to avoid blocking the UI.
     *
     * @param pixels - Thresholded RGBA Uint8Array (black/white)
     * @param width - Image width
     * @param height - Image height
     * @returns SVG string
     */
    async trace(pixels: Uint8Array, width: number, height: number): Promise<string> {
        // Convert pixels to PNG ArrayBuffer via OffscreenCanvas
        // Create a fresh clamped view to satisfy DOM typings (ArrayBuffer-backed)
        const imageData = new ImageData(
            new Uint8ClampedArray(pixels),
            width,
            height
        )
        const offscreen = new OffscreenCanvas(width, height)
        const ctx = offscreen.getContext('2d')!
        ctx.putImageData(imageData, 0, 0)
        const blob = await offscreen.convertToBlob({ type: 'image/png' })
        const pngData = await blob.arrayBuffer()

        // Send to worker and wait for result
        return new Promise<string>((resolve, reject) => {
            const worker = this.getWorker()

            worker.onmessage = (e: MessageEvent) => {
                if (e.data.type === 'result') {
                    resolve(e.data.svg)
                } else if (e.data.type === 'error') {
                    reject(new Error(e.data.message))
                }
            }

            worker.onerror = (err) => {
                reject(new Error(err.message || 'Worker error'))
            }

            worker.postMessage(
                { type: 'trace', pngData, width, height },
                [pngData] // Transfer ownership for zero-copy
            )
        })
    }

    destroy(): void {
        this.worker?.terminate()
        this.worker = null
    }
}
