import { hexToRgb } from "../hexToRgb";

export interface ParameterMapColorStop {
    pos: number;
    color: string;
}

export const PARAMETER_MAP_DEFAULT_STOPS: readonly ParameterMapColorStop[] = [
    { pos: 0, color: "#ffffff" },
    { pos: 20, color: "#b3b3b3" },
    { pos: 82, color: "#000000" },
] as const;

const MAX_MAP_VALUE = 139;

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/** Smooth linear LUT for the parameter map default colormap.
 *  Interpolates between the user-selected stops: #ffffff @ 0, #b3b3b3 @ 20, #000000 @ 82. */
export function buildParameterMapDefaultLUT(): Uint8Array {
    const lut = new Uint8Array(256 * 4);
    const stops = PARAMETER_MAP_DEFAULT_STOPS;

    for (let i = 0; i < 256; i++) {
        const v = Math.min(i, MAX_MAP_VALUE);
        // Default to the last stop so values above the highest threshold clamp to it.
        let left = stops[stops.length - 1];
        let right = stops[stops.length - 1];

        for (let s = 0; s < stops.length - 1; s++) {
            const a = stops[s];
            const b = stops[s + 1];
            if (v >= a.pos && v <= b.pos) {
                left = a;
                right = b;
                break;
            }
        }

        const t = right.pos === left.pos ? 0 : (v - left.pos) / (right.pos - left.pos);
        const [r1, g1, b1] = hexToRgb(left.color);
        const [r2, g2, b2] = hexToRgb(right.color);
        const j = i * 4;

        lut[j + 0] = Math.round(lerp(r1, r2, t));
        lut[j + 1] = Math.round(lerp(g1, g2, t));
        lut[j + 2] = Math.round(lerp(b1, b2, t));
        lut[j + 3] = 255;
    }

    return lut;
}
