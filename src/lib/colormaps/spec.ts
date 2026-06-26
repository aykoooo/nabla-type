import { hexToRgb } from "./hexToRgb";

export type ColormapMode = "linear" | "step";

export interface ColorStop {
  pos: number;
  color: string;
}

export interface ColormapSpec {
  id: string;
  label: string;
  mode: ColormapMode;
  stops: ColorStop[];
  gamma?: number;
  cyclic?: boolean;
  space?: string;
  hidden?: boolean;
}

export function isColormapSpec(v: unknown): v is ColormapSpec {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;

  if (typeof o.id !== "string" || !o.id) return false;
  if (typeof o.label !== "string") return false;
  if (o.mode !== "linear" && o.mode !== "step") return false;
  if (!Array.isArray(o.stops) || !o.stops.length) return false;

  for (const s of o.stops) {
    if (!s || typeof s !== "object") return false;
    const stop = s as Record<string, unknown>;
    if (typeof stop.pos !== "number" || Number.isNaN(stop.pos)) return false;
    if (
      typeof stop.color !== "string" ||
      !/^#[0-9a-fA-F]{6}$/.test(stop.color)
    ) {
      return false;
    }
  }

  if (o.gamma !== undefined && (typeof o.gamma !== "number" || o.gamma <= 0))
    return false;
  if (o.cyclic !== undefined && typeof o.cyclic !== "boolean") return false;
  if (o.space !== undefined && typeof o.space !== "string") return false;
  if (o.hidden !== undefined && typeof o.hidden !== "boolean") return false;

  return true;
}

interface NormalizedStop {
  pos: number;
  rgb: [number, number, number];
}

export function buildLUTFromSpec(spec: ColormapSpec): Uint8Array {
  const stops = normalizeStops(spec.stops);
  const gamma = spec.gamma && spec.gamma > 0 ? spec.gamma : 1.0;
  const uniform = stops.length === 1 || stops.every((s) => s.pos === stops[0].pos);

  const lut = new Uint8Array(256 * 4);

  for (let i = 0; i < 256; i++) {
    const rgb = uniform
      ? stops[0].rgb
      : sampleStops(stops, spec.mode, i / 255, gamma);

    lut[i * 4 + 0] = rgb[0];
    lut[i * 4 + 1] = rgb[1];
    lut[i * 4 + 2] = rgb[2];
    lut[i * 4 + 3] = 255;
  }

  return lut;
}

function normalizeStops(stops: ColorStop[]): NormalizedStop[] {
  return stops
    .map((s) => ({
      pos: Math.max(0, Math.min(1, s.pos)),
      rgb: hexToRgb(s.color),
    }))
    .sort((a, b) => a.pos - b.pos);
}

function sampleStops(
  stops: NormalizedStop[],
  mode: ColormapMode,
  t: number,
  gamma: number,
): [number, number, number] {
  let leftIdx = 0;
  for (let j = 1; j < stops.length; j++) {
    if (stops[j].pos <= t) leftIdx = j;
    else break;
  }

  const rightIdx = Math.min(leftIdx + 1, stops.length - 1);
  const left = stops[leftIdx];
  const right = stops[rightIdx];

  if (mode === "step") return left.rgb;

  const span = right.pos - left.pos;
  let localT = span <= 1e-9 ? 0 : (t - left.pos) / span;
  localT = Math.max(0, Math.min(1, localT));
  if (gamma !== 1.0) localT = Math.pow(localT, 1 / gamma);

  return [
    Math.round(lerp(left.rgb[0], right.rgb[0], localT)),
    Math.round(lerp(left.rgb[1], right.rgb[1], localT)),
    Math.round(lerp(left.rgb[2], right.rgb[2], localT)),
  ];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
