import type { GradientStop } from "$lib/store/simStore.svelte";
import { ColormapRegistry } from "./ColormapRegistry";
import { buildLUTFromSpec, type ColormapSpec } from "./spec";

export function gradientStopsToSpec(stops: GradientStop[]): ColormapSpec {
  return {
    id: "custom",
    label: "Custom Gradient",
    mode: "linear",
    stops: stops.map((s) => ({ pos: s.position, color: s.color })),
  };
}

/**
 * Build the LUT for the active colormap.
 * Returns null when the colormap cannot be resolved.
 */
export function buildActiveLUT(
  activeColormapId: string,
  customGradientStops: GradientStop[],
): Uint8Array | null {
  try {
    if (activeColormapId === "custom") {
      return buildLUTFromSpec(gradientStopsToSpec(customGradientStops));
    }
    return ColormapRegistry.getLUT(activeColormapId);
  } catch {
    return null;
  }
}
