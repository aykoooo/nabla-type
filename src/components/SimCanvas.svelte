<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { GrayScott } from "$lib/simulation/GrayScott";
  import { ColormapRegistry } from "$lib/colormaps/ColormapRegistry";
  import { blackwhite } from "$lib/colormaps/maps/blackwhite";
  import { xmorphia } from "$lib/colormaps/maps/xmorphia";
  import { SeedGenerator } from "$lib/seed/SeedGenerator";
  import { store } from "$lib/store/simStore.svelte";

  // Register built-in colormaps
  ColormapRegistry.register(blackwhite);
  ColormapRegistry.register(xmorphia);

  let canvasEl: HTMLCanvasElement;
  let sim: GrayScott | null = null;
  let animFrameId: number = 0;
  let seedGen = new SeedGenerator();
  let errorMsg = $state("");

  // FPS tracking
  let lastFrameTime = 0;
  let frameCount = 0;
  let fpsAccumulator = 0;

  // Export sim reference for other components
  export function getSimulation(): GrayScott | null {
    return sim;
  }

  // Re-seed the simulation with current text
  export function reseed() {
    if (!sim) return;
    const imageData = seedGen.renderText(
      store.seedText,
      null,
      store.resolution.width,
      store.resolution.height,
      store.seedFontSize,
    );
    const state = seedGen.imageDataToSimState(imageData);
    sim.injectSeedFloat(state);
    store.iterationCount = 0;
  }

  // Re-seed with a specific font
  export function reseedWithFont(font: any) {
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

  // Upload colormap to GPU
  function uploadCurrentColormap() {
    if (!sim) return;
    try {
      const cm = ColormapRegistry.get(store.activeColormapId);
      const lut = cm.buildLUT();
      sim.uploadColormap(lut);
    } catch {
      // blackwhite mode doesn't need LUT
    }
  }

  // Track colormap changes
  let lastColormapId = store.activeColormapId;
  function checkColormapChange() {
    if (store.activeColormapId !== lastColormapId) {
      lastColormapId = store.activeColormapId;
      uploadCurrentColormap();
    }
  }

  function loop(timestamp: number) {
    if (!sim) return;

    // FPS calculation
    if (lastFrameTime > 0) {
      const delta = timestamp - lastFrameTime;
      fpsAccumulator += delta;
      frameCount++;
      if (fpsAccumulator >= 1000) {
        store.fps = Math.round((frameCount * 1000) / fpsAccumulator);
        frameCount = 0;
        fpsAccumulator = 0;
      }
    }
    lastFrameTime = timestamp;

    checkColormapChange();

    if (store.isRunning) {
      sim.step(store.params);
      store.iterationCount += store.params.stepsPerFrame;
    }

    sim.render(true);

    animFrameId = requestAnimationFrame(loop);
  }

  onMount(() => {
    try {
      sim = new GrayScott(
        canvasEl,
        store.resolution.width,
        store.resolution.height,
      );

      uploadCurrentColormap();
      reseed();
      animFrameId = requestAnimationFrame(loop);
    } catch (e: any) {
      errorMsg = e.message || "Failed to initialize WebGL simulation.";
      console.error(e);
    }
  });

  onDestroy(() => {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    sim?.destroy();
    sim = null;
  });
</script>

<div>
  {#if errorMsg}
    <div
      class="absolute inset-0 flex items-center justify-center bg-red-100 z-10 p-8"
    >
      <p class="text-red-600 text-center max-w-sm">⚠ {errorMsg}</p>
    </div>
  {/if}
  <canvas
    bind:this={canvasEl}
    width={store.resolution.width}
    height={store.resolution.height}
    style="image-rendering: pixelated; display: block;"
  ></canvas>
</div>
