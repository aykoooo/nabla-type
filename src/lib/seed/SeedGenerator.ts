import type { Font } from 'opentype.js'

export class SeedGenerator {
    /**
     * Renders text to an offscreen Canvas 2D at simulation resolution.
     * Returns ImageData where black pixels = seeded, white = empty.
     */
    renderText(
        text: string,
        font: Font | null,
        width: number,
        height: number,
        fontSize: number
    ): ImageData {
        const canvas = new OffscreenCanvas(width, height)
        const ctx = canvas.getContext('2d')
        if (!ctx) {
            return new ImageData(width, height)
        }

        // Fill with white (background = no reaction)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)

        // Draw text in black (glyph = seeded)
        ctx.fillStyle = '#000000'

        const safeText = text || 'A'
        if (font) {
            const path = font.getPath(safeText, 0, 0, fontSize)
            const bbox = path.getBoundingBox()
            const textWidth = bbox.x2 - bbox.x1
            const textHeight = bbox.y2 - bbox.y1
            const x = (width - textWidth) / 2 - bbox.x1
            const y = (height - textHeight) / 2 - bbox.y1

            font.getPath(safeText, x, y, fontSize).draw(ctx as unknown as CanvasRenderingContext2D)
        } else {
            ctx.font = `bold ${fontSize}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(safeText, width / 2, height / 2)
        }

        return ctx.getImageData(0, 0, width, height)
    }

    /**
     * Converts ImageData to initial simulation texture data.
     * Black pixel → A=0.50, B=1.00 (seeded, triggers RD pattern)
     * White pixel → A=1.00, B=0.00 (empty state, no reaction)
     * Returns a Float32Array suitable for regl texture upload (RGBA float)
     */
    imageDataToSimState(imageData: ImageData): Float32Array {
        const w = imageData.width
        const h = imageData.height
        const pixels = imageData.data
        const data = new Float32Array(w * h * 4)

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                // Flip Y: WebGL origin is bottom-left, canvas origin is top-left
                const srcIdx = (y * w + x) * 4
                const dstIdx = ((h - 1 - y) * w + x) * 4
                const brightness = pixels[srcIdx] // Red channel

                if (brightness <= 128) {
                    // Dark pixel = glyph area = seeded
                    data[dstIdx + 0] = 0.5   // A
                    data[dstIdx + 1] = 1.0   // B
                } else {
                    // Light pixel = background = empty
                    data[dstIdx + 0] = 1.0   // A
                    data[dstIdx + 1] = 0.0   // B
                }
                data[dstIdx + 2] = 0.0
                data[dstIdx + 3] = 1.0
            }
        }

        return data
    }
}
