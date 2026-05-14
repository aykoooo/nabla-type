<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { GrayScott } from "$lib/simulation/GrayScott";
  import { ColormapRegistry } from "$lib/colormaps/ColormapRegistry";
  import { blackwhite } from "$lib/colormaps/maps/blackwhite";
  import { xmorphia } from "$lib/colormaps/maps/xmorphia";
  import { SeedGenerator } from "$lib/seed/SeedGenerator";
  import type { GradientStop } from "$lib/store/simStore.svelte";
import type { Font } from "opentype.js";
  import {
    store,
    pushPauseSnapshot,
    popPauseSnapshot,
    clearPauseSnapshots,
  } from "$lib/store/simStore.svelte";
  import { replay } from "$lib/store/replayStore.svelte";
  import { SimLoopManager } from "$lib/simulation/SimLoopManager";
  import { simController } from "$lib/store/simController";
  let { onCanvasDblClick }: { onCanvasDblClick?: () => void } = $props();

  // Register built-in colormaps
  ColormapRegistry.register(blackwhite);
  ColormapRegistry.register(xmorphia);

  let canvasEl: HTMLCanvasElement;
  let sim: GrayScott | null = null;
  let loopManager = new SimLoopManager();
  let seedGen = new SeedGenerator();
  let errorMsg = $state("");

  // Export sim reference for other components
  export function getSimulation(): GrayScott | null {
    return sim;
  }

  export function getCanvasElement(): HTMLCanvasElement | null {
    return canvasEl ?? null;
  }

  export function capturePauseSnapshot() {
    if (!sim) return;
    pushPauseSnapshot({
      state: Float32Array.from(sim.readStateFloat()),
      iteration: store.iterationCount,
      params: { ...store.params },
      width: sim.getWidth(),
      height: sim.getHeight(),
      activeColormapId: store.activeColormapId,
      customColorHex: store.customColorHex,
      customGradientHexes: [...store.customGradientHexes],
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
    });
  }

  export function restorePauseSnapshot() {
    const snap = popPauseSnapshot();
    if (!sim || !snap) return;
    if (sim.getWidth() !== snap.width || sim.getHeight() !== snap.height) {
      resizeSimulation(snap.width, snap.height);
    }
    loopManager.resetAccumulators();
    const cleanState = Float32Array.from(snap.state);
    console.log("Restoring snapshot. cleanState length:", cleanState.length);
    sim.writeStateFloat(cleanState);
    store.iterationCount = snap.iteration;
    store.params.feed = snap.params.feed;
    store.params.kill = snap.params.kill;
    store.params.da = snap.params.da;
    store.params.db = snap.params.db;
    store.params.dt = snap.params.dt;
    store.params.stepsPerFrame = snap.params.stepsPerFrame;

    store.activeColormapId = snap.activeColormapId;
    store.customColorHex = snap.customColorHex;
    store.customGradientHexes = [...snap.customGradientHexes];
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

    sim.render(store.activeColormapId !== "blackwhite");
  }

  export function restoreReplayCursorFrame() {
    if (!sim) return;
    const frame = replay.getCurrentFrame();
    if (!frame) return;
    if (frame.width !== sim.getWidth() || frame.height !== sim.getHeight())
      return;
    loopManager.resetAccumulators();
    const cleanState = Float32Array.from(frame.state);
    sim.writeStateFloat(cleanState);
    store.iterationCount = frame.iteration;
    store.params.feed = frame.params.feed;
    store.params.kill = frame.params.kill;
    store.params.da = frame.params.da;
    store.params.db = frame.params.db;
    store.params.dt = frame.params.dt;
    store.params.stepsPerFrame = frame.params.stepsPerFrame;
    sim.render(store.activeColormapId !== "blackwhite");
  }

  function parseHex(hex: string): [number, number, number] {
    const safeHex = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#000000";
    return [
      parseInt(safeHex.slice(1, 3), 16),
      parseInt(safeHex.slice(3, 5), 16),
      parseInt(safeHex.slice(5, 7), 16),
    ];
  }

  function buildCustomLUT(stops: GradientStop[]): Uint8Array {
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
      const [r, g, b] = parseHex(safeStops[0].color);
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

      const [r1, g1, b1] = parseHex(left.color);
      const [r2, g2, b2] = parseHex(right.color);

      lut[i * 4 + 0] = Math.round(r1 + (r2 - r1) * localT);
      lut[i * 4 + 1] = Math.round(g1 + (g2 - g1) * localT);
      lut[i * 4 + 2] = Math.round(b1 + (b2 - b1) * localT);
      lut[i * 4 + 3] = 255;
    }
    return lut;
  }

  // Re-seed the simulation with current text
  export function reseed() {
    if (!sim) return;
    const imageData = seedGen.renderText(
      store.seedText,
      store.seedFont,
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

  // Re-seed with a specific font
  export function reseedWithFont(font: Font | null) {
    if (!sim) return;
    try {
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
    } catch (err) {
      console.warn(
        "Custom font reseed failed, falling back to default font.",
        err,
      );
      const imageData = seedGen.renderText(
        store.seedText,
        null,
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
  }

  export function clearSimulation() {
    if (!sim) return;
    sim.clearState();
    replay.clear();
    clearPauseSnapshots();
    store.iterationCount = 0;
  }

  // Resize simulation to new dimensions (preserves state)
  export function resizeSimulation(w: number, h: number) {
    if (!sim) return;
    store.resolution.width = w;
    store.resolution.height = h;
    // Explicitly set canvas element dimensions BEFORE sim.resize()
    // so REGL picks up the new viewport immediately
    canvasEl.width = w;
    canvasEl.height = h;
    sim.resize(w, h);
  }

  // Get exact bounding box of non-empty pixels
  export function getActiveBoundsSize(): {
    width: number;
    height: number;
  } | null {
    if (!sim) return null;
    const w = sim.getWidth();
    const h = sim.getHeight();
    const state = sim.readStateFloat(); // RGBA, where B is index 1

    let minX = w,
      maxX = 0,
      minY = h,
      maxY = 0;
    let found = false;

    // Scan for B > 0.01 (active reaction)
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
    // Max distance from center to symmetric edge
    const maxDx = Math.max(Math.abs(minX - cx), Math.abs(maxX - cx));
    const maxDy = Math.max(Math.abs(minY - cy), Math.abs(maxY - cy));

    // Calculate required width/height, pad by a few pixels so it is not cramped.
    return {
      width: Math.ceil(maxDx * 2) + 16,
      height: Math.ceil(maxDy * 2) + 16,
    };
  }

  // Upload colormap to GPU
  function uploadCurrentColormap() {
    if (!sim) return;
    if (store.activeColormapId === "custom") {
      sim.uploadColormap(buildCustomLUT(store.customGradientStops));
      return;
    }
    try {
      const cm = ColormapRegistry.get(store.activeColormapId);
      const lut = cm.buildLUT();
      sim.uploadColormap(lut);
    } catch {
      // blackwhite mode doesn't need LUT
    }
  }

  // Upload colormap only when selection changes
  $effect(() => {
    store.activeColormapId;
    uploadCurrentColormap();
  });

  $effect(() => {
    store.customGradientStops;
    if (store.activeColormapId === "custom") {
      uploadCurrentColormap();
    }
  });

  onMount(() => {
    try {
      sim = new GrayScott(
        canvasEl,
        store.resolution.width,
        store.resolution.height,
        {
          onContextLost: () => {
            console.warn('WebGL context lost — simulation paused');
            loopManager.stop();
          },
          onContextRestored: () => {
            console.log('WebGL context restored — reinitializing simulation');
            // Re-upload colormap and current state
            uploadCurrentColormap();
            // Re-seed with current text to get a valid starting state
            reseed();
            loopManager.start(sim!);
          },
        }
      );

      uploadCurrentColormap();
      reseed();
      loopManager.start(sim);

      // Wire up the controller so it can call canvas methods
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
      errorMsg = (e as Error).message || "Failed to initialize WebGL simulation.";
      console.error(e);
    }
  });

  onDestroy(() => {
    simController.setCanvasRef(null);
    loopManager.stop();
    sim?.destroy();
    sim = null;
  });
</script>

<div class="relative inline-block h-full w-full">
  {#if errorMsg}
    <div
      class="absolute inset-0 flex flex-col items-center justify-center bg-neutral-100 z-10 p-8"
    >
      <div class="border border-black bg-white p-6 max-w-md w-full shadow-[8px_8px_0px_#000]">
          <h2 class="text-lg font-bold uppercase tracking-widest mb-3 border-b border-black pb-2 text-red-600">⚠ Hardware Error</h2>
          <p class="text-sm font-mono text-black break-words mb-4">{errorMsg}</p>
          <p class="text-xs font-mono text-black/70">
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
