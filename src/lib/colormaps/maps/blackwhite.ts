import type { Colormap } from '../ColormapRegistry'

export const blackwhite: Colormap = {
    id: 'blackwhite',
    label: 'Black & White',
    buildLUT(): Uint8Array {
        const lut = new Uint8Array(256 * 4)
        for (let i = 0; i < 256; i++) {
            // B < ~0.15 (index < 38) → white, B >= ~0.15 → black
            // Typical Gray-Scott B values in patterns are 0.1–0.4
            const val = i < 38 ? 255 : 0
            lut[i * 4 + 0] = val
            lut[i * 4 + 1] = val
            lut[i * 4 + 2] = val
            lut[i * 4 + 3] = 255
        }
        return lut
    }
}
