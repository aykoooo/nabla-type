import { store } from "./simStore.svelte";
import { replay } from "./replayStore.svelte";
import { applyAspect, clampResolution } from "$lib/utils/resolutionUtils";
import { cloneParams, findActiveIndex, getPresetById } from "./presetStore";
import type { GrayScott } from "../simulation/GrayScott";
import type { Font } from "opentype.js";

export type AspectMode = "free" | "1:1" | "4:3" | "16:9" | "custom";

export interface SimCanvasRef {
    reseed: () => void;
    reseedWithFont: (font: Font) => void;
    getCanvasElement: () => HTMLCanvasElement | null;
    getSimulation: () => GrayScott | null;
    capturePauseSnapshot: () => void;
    restorePauseSnapshot: () => void;
    restoreReplayCursorFrame: () => void;
    clearSimulation: () => void;
    getActiveBoundsSize: () => { width: number; height: number } | null;
    resizeSimulation: (w: number, h: number) => void;
}

export interface ViewportRef {
    centerCanvas: () => void;
    getScale: () => number;
}

class SimController {
    canvasRef: SimCanvasRef | null = null;
    viewportRef: ViewportRef | null = null;

    setCanvasRef(ref: SimCanvasRef | null) {
        this.canvasRef = ref;
    }

    setViewportRef(ref: ViewportRef | null) {
        this.viewportRef = ref;
    }

    handleCenter() {
        this.viewportRef?.centerCanvas();
    }

    handleCanvasResize(w: number, h: number) {
        const adjusted = applyAspect(w, h, store.aspectMode, store.resolutionLocked, "max", store.customAspectRatio);
        const clamped = clampResolution(adjusted.width, adjusted.height);
        this.canvasRef?.resizeSimulation(clamped.width, clamped.height);
        store.resolution.width = clamped.width;
        store.resolution.height = clamped.height;
        this.viewportRef?.centerCanvas();
    }

    handleManualResolution(w: number, h: number, basis: "width" | "height" | "max" = "max") {
        const adjusted = applyAspect(w, h, store.aspectMode, store.resolutionLocked, basis, store.customAspectRatio);
        this.handleCanvasResize(adjusted.width, adjusted.height);
    }

    handleAspectMode(mode: AspectMode) {
        store.aspectMode = mode;
        store.resolutionLocked = mode !== "free";
        if (mode === "free") store.customAspectRatio = null;
        const current = applyAspect(store.resolution.width, store.resolution.height, store.aspectMode, store.resolutionLocked, "max", store.customAspectRatio);
        this.handleCanvasResize(current.width, current.height);
    }

    handleLockCurrentRatio() {
        const { width, height } = store.resolution;
        if (width <= 0 || height <= 0) return;
        store.customAspectRatio = width / height;
        store.aspectMode = "custom";
        store.resolutionLocked = true;
        // No canvas resize — ratio is already satisfied by the current dimensions
    }

    handleResolutionLock(locked: boolean) {
        store.resolutionLocked = locked;
        if (!locked) {
            store.aspectMode = "free";
            store.customAspectRatio = null;
        }
    }

    handleTargetFps(value: number) {
        store.targetFps = Math.max(0, Math.min(240, Math.round(value)));
    }

    handleMin() {
        const activeSize = this.canvasRef?.getActiveBoundsSize();
        if (activeSize) {
            const adjusted = applyAspect(activeSize.width, activeSize.height, store.aspectMode, store.resolutionLocked, "max", store.customAspectRatio);
            const clamped = clampResolution(adjusted.width, adjusted.height);
            this.handleCanvasResize(clamped.width, clamped.height);
        }
    }

    handleMax() {
        const scale = Math.max(0.01, this.viewportRef?.getScale?.() ?? 1);
        const viewportW = Math.min(8192, Math.floor((window.innerWidth * 0.65) / scale));
        const viewportH = Math.min(8192, Math.floor((window.innerHeight * 0.72) / scale));
        const adjusted = applyAspect(viewportW, viewportH, store.aspectMode, store.resolutionLocked, "max", store.customAspectRatio);
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

    resetParamsToPreset() {
        this.applyPresetById(store.activePresetId);
    }

    handleLoop() {
        if (store.seedFont) {
            this.canvasRef?.reseedWithFont(store.seedFont);
        } else {
            this.canvasRef?.reseed();
        }
    }

    private shiftReplayCursor(delta: number) {
        if (store.isRunning) {
            store.isRunning = false;
        }
        replay.step(delta);
        this.canvasRef?.restoreReplayCursorFrame();
    }

    handleReplayStep(delta: number) {
        this.shiftReplayCursor(delta);
    }

    handleReplayJump(delta: number) {
        this.shiftReplayCursor(delta);
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

    cyclePreset(direction: -1 | 1) {
        const list = store.presets;
        if (list.length === 0) return;
        const idx = findActiveIndex(list, store.activePresetId);
        const start = idx >= 0 ? idx : 0;
        const next = (start + direction + list.length) % list.length;
        this.applyPresetById(list[next].id);
    }

    applyPresetById(id: string) {
        const entry = getPresetById(store.presets, id);
        if (!entry) return;
        store.activePresetId = id;
        store.params.feed = entry.params.feed;
        store.params.kill = entry.params.kill;
        store.params.da = entry.params.da;
        store.params.db = entry.params.db;
        store.params.dt = entry.params.dt;
        store.params.stepsPerFrame = entry.params.stepsPerFrame;
        store.baselineParams = cloneParams(entry.params);
    }

    }

export const simController = new SimController();
