<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { GrayScott } from "$lib/simulation/GrayScott";
    import { buildActiveLUT } from "$lib/colormaps/buildLUT";
    import { SeedGenerator } from "$lib/seed/SeedGenerator";
    import type { Font } from "opentype.js";
    import type { SimParams } from "$lib/simulation/presets";
    import {
        store,
        pushPauseSnapshot,
        popPauseSnapshot,
        clearPauseSnapshots,
        type PauseSnapshot,
    } from "$lib/store/simStore.svelte";
    import { replay } from "$lib/store/replayStore.svelte";
    import { SimLoopManager } from "$lib/simulation/SimLoopManager";
    import { simController } from "$lib/store/simController";

    let { onCanvasDblClick }: { onCanvasDblClick?: () => void } = $props();

    let canvasEl: HTMLCanvasElement;
    let sim: GrayScott | null = null;
    let loopManager = new SimLoopManager();
    let seedGen = new SeedGenerator();
    let errorMsg = $state("");
    let colormapDebounceTimer: ReturnType<typeof setTimeout>;

    export function getSimulation(): GrayScott | null {
        return sim;
    }

    export function getCanvasElement(): HTMLCanvasElement | null {
        return canvasEl ?? null;
    }

    function buildSnapshot(
        iteration: number,
        width: number,
        height: number,
        state: Float32Array,
    ): PauseSnapshot {
        return {
            state,
            iteration,
            width,
            height,
            params: { ...store.params },
            activeColormapId: store.activeColormapId,
            customColorHex: store.customColorHex,
            customSeedSourceId: store.customSeedSourceId,
            customGradientStops: [...store.customGradientStops],
            resolution: { ...store.resolution },
            resolutionLocked: store.resolutionLocked,
            aspectMode: store.aspectMode,
            useParamMaps: store.useParamMaps,
            activePresetId: store.activePresetId,
            seedText: store.seedText,
            seedFontSize: store.seedFontSize,
            seedFont: store.seedFont,
            seedFontName: store.seedFontName,
            targetFps: store.targetFps,
            targetIteration: store.targetIteration,
            boundaryMode: store.boundaryMode,
        };
    }

    export function capturePauseSnapshot() {
        if (!sim) return;
        pushPauseSnapshot(
            buildSnapshot(
                store.iterationCount,
                sim.getWidth(),
                sim.getHeight(),
                Float32Array.from(sim.readStateFloat()),
            ),
        );
    }

    interface StateFrame {
        state: Float32Array;
        iteration: number;
        params: SimParams;
    }

    function applySimulationState(frame: StateFrame) {
        if (!sim) return;
        loopManager.resetAccumulators();
        sim.writeStateFloat(Float32Array.from(frame.state));
        store.iterationCount = frame.iteration;
        store.params = { ...frame.params };
    }

    function applyPauseSnapshot(snap: PauseSnapshot) {
        applySimulationState(snap);

        store.activeColormapId = snap.activeColormapId;
        store.customColorHex = snap.customColorHex;
        store.customSeedSourceId = snap.customSeedSourceId;
        store.customGradientStops = [...snap.customGradientStops];
        store.resolution = { ...snap.resolution };
        store.resolutionLocked = snap.resolutionLocked;
        store.aspectMode = snap.aspectMode;
        store.useParamMaps = snap.useParamMaps;
        store.activePresetId = snap.activePresetId;
        store.seedText = snap.seedText;
        store.seedFontSize = snap.seedFontSize;
        store.seedFont = snap.seedFont;
        store.seedFontName = snap.seedFontName;
        store.targetFps = snap.targetFps;
        store.targetIteration = snap.targetIteration;
        store.boundaryMode = snap.boundaryMode;
    }

    export function restorePauseSnapshot() {
        const snap = popPauseSnapshot();
        if (!sim || !snap) return;

        if (sim.getWidth() !== snap.width || sim.getHeight() !== snap.height) {
            resizeSimulation(snap.width, snap.height);
        }

        applyPauseSnapshot(snap);
        sim.render();
    }

    export function restoreReplayCursorFrame() {
        if (!sim) return;
        const frame = replay.getCurrentFrame();
        if (!frame) return;
        if (frame.width !== sim.getWidth() || frame.height !== sim.getHeight())
            return;

        applySimulationState(frame);
        sim.render();
    }

    function injectSeed(font: Font | null) {
        if (!sim) return;
        const imageData = seedGen.renderText(
            store.seedText,
            font,
            store.resolution.width,
            store.resolution.height,
            store.seedFontSize,
        );
        const state = seedGen.imageDataToSimState(imageData);
        sim.injectSeedFloat(state);
        replay.clear();
        clearPauseSnapshots();
        store.iterationCount = 0;
    }

    export function reseed() {
        injectSeed(store.seedFont);
    }

    export function reseedWithFont(font: Font | null) {
        try {
            injectSeed(font);
        } catch (err) {
            console.warn(
                "Custom font reseed failed, falling back to default font.",
                err,
            );
            injectSeed(null);
        }
    }

    export function clearSimulation() {
        if (!sim) return;
        sim.clearState();
        replay.clear();
        clearPauseSnapshots();
        store.iterationCount = 0;
    }

    function isPowerOfTwo(n: number): boolean {
        return (n & (n - 1)) === 0 && n > 0;
    }

    function syncBoundaryMode() {
        if (!sim) return;
        const mode = store.boundaryMode;
        const w = store.resolution.width;
        const h = store.resolution.height;
        if (
            (mode === "repeat" || mode === "mirror") &&
            (!isPowerOfTwo(w) || !isPowerOfTwo(h))
        ) {
            store.boundaryMode = "clamp";
            return;
        }
        sim.setBoundaryMode(mode);
    }

    export function resizeSimulation(w: number, h: number) {
        if (!sim) return;
        store.resolution.width = w;
        store.resolution.height = h;
        canvasEl.width = w;
        canvasEl.height = h;
        sim.resize(w, h);
    }

    const ACTIVE_BOUNDS_MAX_PIXELS = 1024 * 1024;

    export function getActiveBoundsSize(): {
        width: number;
        height: number;
    } | null {
        if (!sim) return null;
        const w = sim.getWidth();
        const h = sim.getHeight();
        if (w * h > ACTIVE_BOUNDS_MAX_PIXELS) {
            console.warn(
                `getActiveBoundsSize skipped: canvas ${w}x${h} exceeds ${ACTIVE_BOUNDS_MAX_PIXELS} pixel limit.`,
            );
            return null;
        }

        const state = sim.readStateFloat();
        let minX = w,
            maxX = 0,
            minY = h,
            maxY = 0;
        let found = false;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const b = state[(y * w + x) * 4 + 1];
                if (b > 0.01) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    found = true;
                }
            }
        }

        if (!found) return null;

        const cx = w / 2;
        const cy = h / 2;
        const maxDx = Math.max(Math.abs(minX - cx), Math.abs(maxX - cx));
        const maxDy = Math.max(Math.abs(minY - cy), Math.abs(maxY - cy));

        return {
            width: Math.ceil(maxDx * 2) + 16,
            height: Math.ceil(maxDy * 2) + 16,
        };
    }

    function uploadCurrentColormap() {
        if (!sim) return;
        const lut = buildActiveLUT(
            store.activeColormapId,
            store.customGradientStops,
        );
        if (lut) sim.uploadColormap(lut);
    }

    $effect(() => {
        store.activeColormapId;
        uploadCurrentColormap();
    });

    $effect(() => {
        store.customGradientStops;
        clearTimeout(colormapDebounceTimer);
        colormapDebounceTimer = setTimeout(() => {
            if (store.activeColormapId === "custom") {
                uploadCurrentColormap();
            }
        }, 50);
        return () => clearTimeout(colormapDebounceTimer);
    });

    $effect(() => {
        store.boundaryMode;
        store.resolution.width;
        store.resolution.height;
        syncBoundaryMode();
    });

    onMount(() => {
        try {
            sim = new GrayScott(
                canvasEl,
                store.resolution.width,
                store.resolution.height,
                {
                    onContextLost: () => {
                        console.warn("WebGL context lost — simulation paused");
                        loopManager.stop();
                    },
                    onContextRestored: () => {
                        console.log(
                            "WebGL context restored — reinitializing simulation",
                        );
                        uploadCurrentColormap();
                        reseed();
                        loopManager.start(sim!);
                    },
                },
            );

            syncBoundaryMode();
            uploadCurrentColormap();
            reseed();
            loopManager.start(sim);

            simController.setCanvasRef({
                reseed,
                reseedWithFont,
                getCanvasElement,
                getSimulation,
                capturePauseSnapshot,
                restorePauseSnapshot,
                restoreReplayCursorFrame,
                clearSimulation,
                getActiveBoundsSize,
                resizeSimulation,
            });
        } catch (e) {
            errorMsg =
                (e as Error).message || "Failed to initialize WebGL simulation.";
            console.error(e);
        }
    });

    onDestroy(() => {
        simController.setCanvasRef(null);
        loopManager.stop();
        sim?.destroy();
        sim = null;
        clearTimeout(colormapDebounceTimer);
    });
</script>

<div class="relative inline-block h-full w-full">
    {#if errorMsg}
        <div
            class="absolute inset-0 flex flex-col items-center justify-center bg-neutral-100 z-10 p-8"
        >
            <div
                class="border border-black bg-white p-6 max-w-md w-full shadow-[8px_8px_0px_#000]"
            >
                <h2
                    class="text-lg font-bold uppercase tracking-widest mb-3 border-b border-black pb-2 text-red-600"
                >
                    ⚠ Hardware Error
                </h2>
                <p class="text-sm font-mono text-black break-words mb-4">
                    {errorMsg}
                </p>
                <p class="text-xs font-mono text-brutal-secondary">
                    Simulation requires WebGL1 with OES_texture_float support.
                </p>
            </div>
        </div>
    {/if}
    <canvas
        bind:this={canvasEl}
        width={store.resolution.width}
        height={store.resolution.height}
        ondblclick={onCanvasDblClick}
        style="display: block; image-rendering: pixelated;"
    ></canvas>
</div>
