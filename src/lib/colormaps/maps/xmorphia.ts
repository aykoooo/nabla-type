import type { Colormap } from '../ColormapRegistry'

/**
 * Xmorphia false-color LUT replicating the classic
 * blue → cyan → green → yellow → red gradient across B 0→1
 */
export const xmorphia: Colormap = {
    id: 'xmorphia',
    label: 'Xmorphia',
    buildLUT(): Uint8Array {
        const lut = new Uint8Array(256 * 4)
        // Color stops:
        // 0.00 → dark blue   (10, 10, 80)
        // 0.25 → cyan         (0, 200, 220)
        // 0.50 → green        (20, 200, 20)
        // 0.75 → yellow       (240, 220, 20)
        // 1.00 → red          (200, 10, 10)
        const stops = [
            { t: 0.00, r: 10, g: 10, b: 80 },
            { t: 0.25, r: 0, g: 200, b: 220 },
            { t: 0.50, r: 20, g: 200, b: 20 },
            { t: 0.75, r: 240, g: 220, b: 20 },
            { t: 1.00, r: 200, g: 10, b: 10 },
        ]

        for (let i = 0; i < 256; i++) {
            const t = i / 255

            // Find the two stops we're between
            let s0 = stops[0]
            let s1 = stops[1]
            for (let j = 1; j < stops.length; j++) {
                if (t <= stops[j].t) {
                    s0 = stops[j - 1]
                    s1 = stops[j]
                    break
                }
            }

            const localT = (t - s0.t) / (s1.t - s0.t)
            lut[i * 4 + 0] = Math.round(s0.r + (s1.r - s0.r) * localT)
            lut[i * 4 + 1] = Math.round(s0.g + (s1.g - s0.g) * localT)
            lut[i * 4 + 2] = Math.round(s0.b + (s1.b - s0.b) * localT)
            lut[i * 4 + 3] = 255
        }

        return lut
    }
}
