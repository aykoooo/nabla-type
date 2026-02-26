/// <reference lib="webworker" />

// Web Worker entry point for VTracer SVG tracing
// VTracer WASM is loaded exclusively inside this worker, never on the main thread.

interface TraceMessage {
    type: 'trace'
    pngData: ArrayBuffer
    width: number
    height: number
}

self.onmessage = async (e: MessageEvent<TraceMessage>) => {
    if (e.data.type !== 'trace') return

    try {
        const vtracer = await import('vtracer-webapp')
        const svgString = vtracer.trace(new Uint8Array(e.data.pngData), {
            colormode: 'bw',
        })
        self.postMessage({ type: 'result', svg: svgString })
    } catch (err: any) {
        self.postMessage({ type: 'error', message: err?.message || 'VTracer failed' })
    }
}
