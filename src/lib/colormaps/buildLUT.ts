import type { GradientStop } from "$lib/store/simStore.svelte";
import { ColormapRegistry } from "./ColormapRegistry";
import { hexToRgb } from "./hexToRgb";

export function buildCustomLUT(stops: GradientStop[]): Uint8Array {
  const safeStops = (
    stops.length > 0
      ? stops
      : [
          { color: "#000000", position: 0 },
          { color: "#ffffff", position: 1 },
        ]
  )
    .map((s) => ({
      color: /^#[0-9a-fA-F]{6}$/.test(s.color) ? s.color : "#000000",
      position: Math.max(0, Math.min(1, s.position)),
    }))
    .sort((a, b) => a.position - b.position);

  const stopCount = safeStops.length;
  const lut = new Uint8Array(256 * 4);

  if (stopCount === 1) {
    const [r, g, b] = hexToRgb(safeStops[0].color);
    for (let i = 0; i < 256; i++) {
      lut[i * 4 + 0] = r;
      lut[i * 4 + 1] = g;
      lut[i * 4 + 2] = b;
      lut[i * 4 + 3] = 255;
    }
    return lut;
  }

  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let left = safeStops[0];
    let right = safeStops[stopCount - 1];

    for (let s = 0; s < stopCount - 1; s++) {
      const a = safeStops[s];
      const b = safeStops[s + 1];
      if (t >= a.position && t <= b.position) {
        left = a;
        right = b;
        break;
      }
    }

    const span = Math.max(1e-6, right.position - left.position);
    const localT = Math.max(0, Math.min(1, (t - left.position) / span));

    const [r1, g1, b1] = hexToRgb(left.color);
    const [r2, g2, b2] = hexToRgb(right.color);

    lut[i * 4 + 0] = Math.round(r1 + (r2 - r1) * localT);
    lut[i * 4 + 1] = Math.round(g1 + (g2 - g1) * localT);
    lut[i * 4 + 2] = Math.round(b1 + (b2 - b1) * localT);
    lut[i * 4 + 3] = 255;
  }
  return lut;
}

/**
 * Build the LUT for the active colormap.
 * Returns null for blackwhite mode (caller should threshold).
 */
export function buildActiveLUT(
  activeColormapId: string,
  customGradientStops: GradientStop[]
): Uint8Array | null {
  if (activeColormapId === "blackwhite") {
    return null;
  }
  if (activeColormapId === "custom") {
    return buildCustomLUT(customGradientStops);
  }
  try {
    const cm = ColormapRegistry.get(activeColormapId);
    return cm.buildLUT();
  } catch {
    return null;
  }
}
