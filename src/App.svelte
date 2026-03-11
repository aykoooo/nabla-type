<script lang="ts">
  import SimCanvas from "./components/SimCanvas.svelte";
  import logoSvg from "./assets/logo.svg";
  import ResizableCanvas from "./components/ResizableCanvas.svelte";
  import PanZoomViewport from "./components/PanZoomViewport.svelte";
  import LayerStrip from "./components/LayerStrip.svelte";
  import InfoBar from "./components/InfoBar.svelte";

  import TopControlBar from "./components/TopControlBar.svelte";
  import LeftToolbar from "./components/LeftToolbar.svelte";
  import BottomTimelineBar from "./components/BottomTimelineBar.svelte";
  import ParameterPanel from "./components/ParameterPanel.svelte";
  import SeedPanel from "./components/SeedPanel.svelte";
  import ColormapPicker from "./components/ColormapPicker.svelte";
  import ExportPanel from "./components/ExportPanel.svelte";
  import { GrayScott } from "$lib/simulation/GrayScott";
  import { SeedGenerator } from "$lib/seed/SeedGenerator";
  import { store } from "$lib/store/simStore.svelte";
  import { replay } from "$lib/store/replayStore.svelte";
  import { simController } from "$lib/store/simController";
  import { onMount, onDestroy } from "svelte";

  let simCanvas: SimCanvas;
  let panZoomViewport: PanZoomViewport;

  // Track resolution changes for resize
  let lastWidth = store.resolution.width;
  let lastHeight = store.resolution.height;
  const seedGen = new SeedGenerator();

  function getAspectRatio(): number | null {
    switch (store.aspectMode) {
      case "1:1":
        return 1;
      case "4:3":
        return 4 / 3;
      case "16:9":
        return 16 / 9;
      default:
        return null;
    }
  }

  function applyAspect(
    w: number,
    h: number,
    basis: "width" | "height" = "width",
  ) {
    const ratio = getAspectRatio();
    if (!store.resolutionLocked || !ratio) {
      return { width: Math.round(w), height: Math.round(h) };
    }

    if (basis === "height") {
      return { width: Math.round(h * ratio), height: Math.round(h) };
    }
    return { width: Math.round(w), height: Math.round(w / ratio) };
  }

  function clampResolution(w: number, h: number) {
    return {
      width: Math.max(32, Math.min(8192, Math.round(w))),
      height: Math.max(32, Math.min(8192, Math.round(h))),
    };
  }

  function handleReseed() {
    if (store.seedFont) {
      simCanvas?.reseedWithFont(store.seedFont);
    } else {
      simCanvas?.reseed();
    }
  }

  function getSimulation(): GrayScott | null {
    return simCanvas?.getSimulation() ?? null;
  }

  function getCanvasElement(): HTMLCanvasElement | null {
    return simCanvas?.getCanvasElement() ?? null;
  }

  // Handle canvas resize from ResizableCanvas handles
  function handleCanvasResize(w: number, h: number) {
    const adjusted = applyAspect(w, h);
    const clamped = clampResolution(adjusted.width, adjusted.height);
    simCanvas?.resizeSimulation(clamped.width, clamped.height);
    lastWidth = clamped.width;
    lastHeight = clamped.height;
  }

  function handleManualResolution(w: number, h: number) {
    const adjusted = applyAspect(w, h);
    handleCanvasResize(adjusted.width, adjusted.height);
  }

  function handleAspectMode(mode: "free" | "1:1" | "4:3" | "16:9") {
    store.aspectMode = mode;
    store.resolutionLocked = mode !== "free";
    const current = applyAspect(
      store.resolution.width,
      store.resolution.height,
    );
    handleCanvasResize(current.width, current.height);
  }

  function handleResolutionLock(locked: boolean) {
    store.resolutionLocked = locked;
  }

  function handleTargetFps(value: number) {
    store.targetFps = Math.max(0, Math.min(240, Math.round(value)));
  }

  // Check for resolution changes from other sources (e.g. export panel)
  $effect(() => {
    const w = store.resolution.width;
    const h = store.resolution.height;
    if (w !== lastWidth || h !== lastHeight) {
      lastWidth = w;
      lastHeight = h;
      const sim = getSimulation();
      if (sim) {
        sim.resize(w, h);
        simCanvas?.reseed();
      }
    }
  });

  // Viewport toolbar handlers handled by simController

  function handleCanvasFocus() {
    setTimeout(() => {
      const input = document.getElementById(
        "seed-text-input",
      ) as HTMLInputElement | null;
      input?.focus();
      input?.select();
    }, 0);
  }

  // Keyboard shortcuts handled centrally by svelte action or component, but for now we'll route it
  function handleKeyDown(e: KeyboardEvent) {
    // Don't trigger when typing in inputs
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (e.code === "Space") {
      e.preventDefault();
      simController.handlePause();
    } else if (e.code === "KeyR") {
      e.preventDefault();
      simController.handleLoop();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    simController.setViewportRef({
      centerCanvas: () => panZoomViewport?.centerCanvas(),
    });
  });

  onDestroy(() => {
    window.removeEventListener("keydown", handleKeyDown);
    simController.setViewportRef(null);
  });
</script>

<div class="h-full flex flex-col bg-white overflow-hidden">
  <!-- Header + TopControlBar -->
  <header
    class="flex items-center border-b border-black shrink-0 relative bg-white z-10 border-r"
  >
    <a href="/" class="flex items-center justify-center w-10 border-r border-black shrink-0">
      <img src={logoSvg} alt="Nabla Type" class="w-8 h-8 object-contain" />
    </a>
    <TopControlBar />
  </header>

  <!-- Main layout -->
  <div class="flex flex-1 min-h-0 overflow-hidden">
    <!-- LEFT PANEL: Actions Toolbar -->
    <LeftToolbar />

    <!-- CENTER PANEL: Viewport + Timeline -->
    <div
      class="flex-1 flex flex-col min-w-0 border-r border-black relative bg-neutral-100"
    >
      <!-- Canvas area with layer strip -->
      <div class="flex flex-1 min-h-0 relative">
        <PanZoomViewport bind:this={panZoomViewport}>
          <ResizableCanvas
            bind:width={store.resolution.width}
            bind:height={store.resolution.height}
            onresize={handleCanvasResize}
          >
            <SimCanvas
              bind:this={simCanvas}
              onCanvasClick={handleCanvasFocus}
            />
          </ResizableCanvas>
        </PanZoomViewport>
        <LayerStrip />
      </div>

      <!-- Info bar -->
      <div class="shrink-0 bg-white border-t border-black">
        <InfoBar />
      </div>

      <!-- Bottom Timeline -->
      <div class="shrink-0 bg-white">
        <BottomTimelineBar />
      </div>
    </div>

    <!-- RIGHT PANEL: Properties (Stacked) -->
    <div class="w-80 flex flex-col shrink-0 bg-white overflow-y-auto">
      <div class="p-3 flex flex-col gap-4">
        <!-- Seed panel (Text input) -->
        <SeedPanel onReseed={handleReseed} />

        <div class="w-full h-px bg-black/20"></div>

        <!-- Diffusion Parameters -->
        <ParameterPanel />

        <div class="w-full h-px bg-black/20"></div>

        <!-- Colormap settings -->
        <div class="flex flex-col gap-2">
          <h3 class="text-xs font-bold uppercase tracking-wider text-black">
            Colors
          </h3>
          <ColormapPicker />
        </div>

        <div class="w-full h-px bg-black/20"></div>

        <!-- Exporter -->
        <div class="flex flex-col gap-2 mb-8">
          <h3 class="text-xs font-bold uppercase tracking-wider text-black">
            Export
          </h3>
          <ExportPanel {getSimulation} {getCanvasElement} />
        </div>
      </div>
    </div>
  </div>
</div>
