import { store } from "./simStore.svelte";
import { replay } from "./replayStore.svelte";
import { applyAspect, clampResolution } from "$lib/utils/resolutionUtils";

export interface SimCanvasRef {
    reseed: () => void;
    reseedWithFont: (font: any) => void;
    getCanvasElement: () => HTMLCanvasElement | null;
    getSimulation: () => any | null; // GrayScott
    capturePauseSnapshot: () => void;
    restorePauseSnapshot: () => void;
    restoreReplayCursorFrame: () => void;
    clearSimulation: () => void;
    getActiveBoundsSize: () => { width: number; height: number } | null;
    resizeSimulation: (w: number, h: number) => void;
}

class SimController {
    canvasRef: SimCanvasRef | null = null;

    setCanvasRef(ref: SimCanvasRef | null) {
        this.canvasRef = ref;
    }

    handleCanvasResize(w: number, h: number) {
        const adjusted = applyAspect(w, h, store.aspectMode, store.resolutionLocked);
        const clamped = clampResolution(adjusted.width, adjusted.height);
        this.canvasRef?.resizeSimulation(clamped.width, clamped.height);
        store.resolution.width = clamped.width;
        store.resolution.height = clamped.height;
    }

    handleManualResolution(w: number, h: number) {
        const adjusted = applyAspect(w, h, store.aspectMode, store.resolutionLocked);
        this.handleCanvasResize(adjusted.width, adjusted.height);
    }

    handleAspectMode(mode: "free" | "1:1" | "4:3" | "16:9") {
        store.aspectMode = mode;
        store.resolutionLocked = mode !== "free";
        const current = applyAspect(store.resolution.width, store.resolution.height, store.aspectMode, store.resolutionLocked);
        this.handleCanvasResize(current.width, current.height);
    }

    handleResolutionLock(locked: boolean) {
        store.resolutionLocked = locked;
    }

    handleTargetFps(value: number) {
        store.targetFps = Math.max(0, Math.min(240, Math.round(value)));
    }

    handleMin() {
        const activeSize = this.canvasRef?.getActiveBoundsSize();
        if (activeSize) {
            const adjusted = applyAspect(activeSize.width, activeSize.height, store.aspectMode, store.resolutionLocked, "width");
            const clamped = clampResolution(adjusted.width, adjusted.height);
            this.handleCanvasResize(clamped.width, clamped.height);
        }
    }

    handleMax() {
        const viewportW = Math.min(8192, Math.floor(window.innerWidth * 0.65));
        const viewportH = Math.min(8192, Math.floor(window.innerHeight * 0.72));
        const adjusted = applyAspect(viewportW, viewportH, store.aspectMode, store.resolutionLocked, "width");
        const clamped = clampResolution(adjusted.width, adjusted.height);
        this.handleCanvasResize(clamped.width, clamped.height);
    }

    handleSave() {
        const sim = this.canvasRef?.getSimulation();
        if (!sim) return;
        const canvas = this.canvasRef?.getCanvasElement();
        if (!canvas) return;
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `rd-frame-${Date.now()}.png`;
        a.click();
    }

    handlePause() {
        if (store.isRunning) {
            // Do nothing extra when pausing
        } else {
            this.canvasRef?.capturePauseSnapshot();
            if (!replay.isAtLatest()) {
                replay.truncate(replay.cursor);
            }
        }
        store.isRunning = !store.isRunning;
    }

    handleUndo() {
        this.canvasRef?.restorePauseSnapshot();
        replay.clear();
        store.isRunning = false;
    }

    handleLoop() {
        if (store.seedFont) {
            this.canvasRef?.reseedWithFont(store.seedFont);
        } else {
            this.canvasRef?.reseed();
        }
    }

    handleReplayStep(delta: number) {
        if (store.isRunning) {
            store.isRunning = false;
        }
        replay.step(delta);
        this.canvasRef?.restoreReplayCursorFrame();
    }

    handleReplayJump(delta: number) {
        if (store.isRunning) {
            store.isRunning = false;
        }
        replay.step(delta);
        this.canvasRef?.restoreReplayCursorFrame();
    }

    handleReplaySeek(index: number) {
        if (store.isRunning) {
            store.isRunning = false;
        }
        replay.setCursor(index);
        this.canvasRef?.restoreReplayCursorFrame();
    }

    handleReplayWindowChange(size: number) {
        replay.setMaxFramesBack(size);
    }

    handleTrash() {
        this.canvasRef?.clearSimulation();
    }
}

export const simController = new SimController();
