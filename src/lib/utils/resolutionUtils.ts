export function getAspectRatio(aspectMode: string, customRatio?: number | null): number | null {
    switch (aspectMode) {
        case "1:1": return 1;
        case "4:3": return 4 / 3;
        case "16:9": return 16 / 9;
        case "custom": return customRatio ?? null;
        default: return null;
    }
}

export function applyAspect(
    w: number,
    h: number,
    aspectMode: string,
    resolutionLocked: boolean,
    basis: "width" | "height" | "max" = "max",
    customRatio?: number | null
) {
    const ratio = getAspectRatio(aspectMode, customRatio);
    if (!resolutionLocked || !ratio) {
        return { width: Math.round(w), height: Math.round(h) };
    }

    const effectiveBasis = basis === "max" ? (w >= h ? "width" : "height") : basis;

    if (effectiveBasis === "height") {
        return { width: Math.round(h * ratio), height: Math.round(h) };
    }
    return { width: Math.round(w), height: Math.round(w / ratio) };
}

export function clampResolution(w: number, h: number) {
    return {
        width: Math.max(32, Math.min(8192, Math.round(w))),
        height: Math.max(32, Math.min(8192, Math.round(h))),
    };
}
