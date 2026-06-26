/**
 * Warps between normalized parameter-map coordinates (u, v) and Gray-Scott
 * feed/kill rates.
 *
 * Vertical parameter-map axis -> feed rate (higher at the top).
 * Horizontal parameter-map axis -> kill rate, warped so the interesting
 * pattern band fills a roughly rectangular area. The bottom of the warp uses
 * a wider horizontal scale, stretching the left/right corners.
 *
 * This warp is inspired by Karl Sims' RD Tool. The original JavaScript
 * expression of the warp in rdtool2.js is:
 *
 *   function xy_to_kf(x, y) {
 *     const y1 = y * .5 + .5;
 *     const f = interp(.002, .12, y1);
 *     const s = sqrt(f) * .5 - f;
 *     const x1 = x * interp(1, (y - .32) * (y - .32), .6) * .5 + .5;
 *     const k0 = interp(-.003, .0115, x1);
 *     const k1 = interp(-.0048, -.0031, x1);
 *     const k = s + interp(k0, k1, y1);
 *     return [k, f];
 *   }
 *
 * The implementation below follows the same geometric relationship, but uses
 * domain-named variables and its own algebraic inverse rather than being a
 * direct transcription of the original source.
 */

export const FEED_MIN = 0.002;
export const FEED_MAX = 0.12;

// Parameter map source texture range: used for readout bars and clamping.
export const KILL_ABS_MIN = 0.014;
export const KILL_ABS_MAX = 0.066;

/**
 * Peak chemical-B concentration in the Karl-Sims feed/kill window used by this
 * app. The live-sim display shader and the parameter-map widget normalize B by
 * this value before sampling a [0,1]-normalized colormap LUT, so the full LUT
 * range is used instead of only the bottom ~55%.
 *
 * Empirical: B saturates at ~0.55 across the warped parameter space.
 *
 * Keep in sync with the B_MAX_KARL_SIMS #define in
 * src/lib/simulation/shaders/display.frag.
 */
export const B_MAX_KARL_SIMS = 0.55;

/** uint8 equivalent of B_MAX_KARL_SIMS for normalizing the parameter-map .bin
 *  payload, which stores B as round(B * 255). 255 * 0.55 = 140.25 -> 140. */
export const B_MAX_KARL_SIMS_UINT8 = Math.round(255 * B_MAX_KARL_SIMS);

// Kill-rate endpoints at the bottom of the map (feed = FEED_MIN).
const KILL_BOTTOM_MIN = -0.003;
const KILL_BOTTOM_MAX = 0.0115;

// Kill-rate endpoints at the top of the map (feed = FEED_MAX).
const KILL_TOP_MIN = -0.0048;
const KILL_TOP_MAX = -0.0031;

// Horizontal scale curve: minimum at y = ±0.32, wider at the extremes.
const HORIZONTAL_SCALE_MIN = 1.0;
const HORIZONTAL_SCALE_CENTER = 0.32;
const HORIZONTAL_SCALE_POWER = 0.6;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp = (x: number, min: number, max: number): number => Math.max(min, Math.min(max, x));

export interface WarpedParams {
    feed: number;
    kill: number;
}

// TODO: add round-trip invariant tests for pixelToWarpedParams and
// warpedParamsToPixel once a test framework is introduced.

/** Warp normalized pixel (u,v) to (feed, kill). */
export function pixelToWarpedParams(u: number, v: number): WarpedParams {
    // Warp-space coordinates: x, y in [-1, 1]; y grows upward.
    const warpX = u * 2.0 - 1.0;
    const warpY = 1.0 - v * 2.0; // top (v=0) -> +1, bottom (v=1) -> -1

    const feedT = warpY * 0.5 + 0.5;
    const feed = lerp(FEED_MIN, FEED_MAX, feedT);

    // Curvature term that bends the kill isocontours across feed values.
    const curvatureOffset = Math.sqrt(feed) * 0.5 - feed;

    // Horizontal scale widens toward top/bottom, narrowing around y=0.32.
    const horizontalScale = lerp(
        HORIZONTAL_SCALE_MIN,
        (warpY - HORIZONTAL_SCALE_CENTER) * (warpY - HORIZONTAL_SCALE_CENTER),
        HORIZONTAL_SCALE_POWER
    );

    // Normalized horizontal parameter, may leave [0, 1] in expanded corners.
    const killT = warpX * horizontalScale * 0.5 + 0.5;

    const killAtBottom = lerp(KILL_BOTTOM_MIN, KILL_BOTTOM_MAX, killT);
    const killAtTop = lerp(KILL_TOP_MIN, KILL_TOP_MAX, killT);
    const kill = curvatureOffset + lerp(killAtBottom, killAtTop, feedT);

    return { feed, kill };
}

/** Inverse: given (feed, kill) return normalized pixel (u, v) in [0, 1]. */
export function warpedParamsToPixel(feed: number, kill: number): { u: number; v: number } {
    const feedClamped = clamp(feed, FEED_MIN, FEED_MAX);

    const feedT = (feedClamped - FEED_MIN) / (FEED_MAX - FEED_MIN);
    const warpY = feedT * 2.0 - 1.0;
    const v = (1.0 - warpY) * 0.5;

    const curvatureOffset = Math.sqrt(feedClamped) * 0.5 - feedClamped;

    // Invert: kill = curvatureOffset + lerp(lerp(bottom), lerp(top), feedT)
    const base = lerp(KILL_BOTTOM_MIN, KILL_TOP_MIN, feedT);
    const slope = lerp(
        KILL_BOTTOM_MAX - KILL_BOTTOM_MIN,
        KILL_TOP_MAX - KILL_TOP_MIN,
        feedT
    );
    const killT = (kill - curvatureOffset - base) / slope;

    const horizontalScale = lerp(
        HORIZONTAL_SCALE_MIN,
        (warpY - HORIZONTAL_SCALE_CENTER) * (warpY - HORIZONTAL_SCALE_CENTER),
        HORIZONTAL_SCALE_POWER
    );
    const warpX = (killT - 0.5) / (horizontalScale * 0.5);
    const u = (warpX + 1.0) * 0.5;

    return {
        u: clamp(u, 0.0, 1.0),
        v: clamp(v, 0.0, 1.0),
    };
}
