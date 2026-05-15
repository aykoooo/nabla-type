<script lang="ts">
  import SimCanvas from "./components/SimCanvas.svelte";
  import logoSvg from "./assets/logo.svg";
  import ResizableCanvas from "./components/ResizableCanvas.svelte";
  import PanZoomViewport from "./components/PanZoomViewport.svelte";
  import InfoBar from "./components/InfoBar.svelte";

import TopControlBar from "./components/TopControlBar.svelte";
import LeftToolbar from "./components/LeftToolbar.svelte";
import BottomTimelineBar from "./components/BottomTimelineBar.svelte";
import ParameterPanel from "./components/ParameterPanel.svelte";
import SeedPanel from "./components/SeedPanel.svelte";
  import { initStorePersistence } from "$lib/store/simStore.svelte";
  import ColormapPicker from "./components/ColormapPicker.svelte";
  import ExportPanel from "./components/ExportPanel.svelte";
  import AccordionPanel from "./components/ui/AccordionPanel.svelte";
  import { GrayScott } from "$lib/simulation/GrayScott";
  import { SeedGenerator } from "$lib/seed/SeedGenerator";
  import { applyAspect, clampResolution } from "$lib/utils/resolutionUtils";
  import { store } from "$lib/store/simStore.svelte";
  import { replay } from "$lib/store/replayStore.svelte";
  import { simController } from "$lib/store/simController";
  import { loadPresets } from "$lib/store/presetStore";
  import { onMount, onDestroy } from "svelte";
  import { Tooltip } from "bits-ui";

  let simCanvas: SimCanvas;
  let panZoomViewport: PanZoomViewport;

  // Track resolution changes for resize
  let lastWidth = store.resolution.width;
  let lastHeight = store.resolution.height;
  const seedGen = new SeedGenerator();
  let seedPanel: ReturnType<typeof SeedPanel>;

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

  // Handle canvas resize from ResizableCanvas handles
  function handleCanvasResize(w: number, h: number) {
    const adjusted = applyAspect(
      w,
      h,
      store.aspectMode,
      store.resolutionLocked,
      "max",
    );
    const clamped = clampResolution(adjusted.width, adjusted.height);
    simCanvas?.resizeSimulation(clamped.width, clamped.height);
    lastWidth = clamped.width;
    lastHeight = clamped.height;
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
      seedPanel?.focusInput();
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
    } else if (e.code === "KeyR" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      simController.handleLoop();
    } else if (e.code === "BracketLeft") {
      e.preventDefault();
      simController.cyclePreset(-1);
    } else if (e.code === "BracketRight") {
      e.preventDefault();
      simController.cyclePreset(1);
    } else if ((e.ctrlKey || e.metaKey) && e.code === "KeyS") {
      e.preventDefault();
      simController.handleSave();
    } else if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") {
      e.preventDefault();
      simController.handleUndo();
    } else if (e.code === "Backspace" || e.code === "Delete") {
      e.preventDefault();
      simController.handleTrash();
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      simController.handleReplayStep(-1);
    } else if (e.code === "ArrowRight") {
      e.preventDefault();
      simController.handleReplayStep(1);
    } else if (e.code === "KeyF" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      simController.handleMax();
    } else if (e.code === "KeyC" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      simController.handleCenter();
    }
  }

  let cleanupPersistence: () => void;

  onMount(() => {
    cleanupPersistence = initStorePersistence();
    window.addEventListener("keydown", handleKeyDown);
    simController.setViewportRef({
      centerCanvas: () => panZoomViewport?.centerCanvas(),
      getScale: () => panZoomViewport?.getScale() ?? 1,
    });
    store.presets = loadPresets();
    simController.applyPresetById(store.activePresetId);
  });

  onDestroy(() => {
    window.removeEventListener("keydown", handleKeyDown);
    simController.setViewportRef(null);
    if (cleanupPersistence) cleanupPersistence();
  });
</script>

<Tooltip.Provider>
<div class="h-full flex flex-col bg-white overflow-hidden">
  <!-- Header + TopControlBar -->
  <header
    class="flex items-center border-b border-black shrink-0 relative bg-white z-10"
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
      <div class="flex flex-1 min-h-0 relative overflow-hidden border-b border-black">
        <PanZoomViewport
          bind:this={panZoomViewport}
          contentMinWidth={store.resolution.width}
          contentMinHeight={store.resolution.height}
        >
          <ResizableCanvas
            bind:width={store.resolution.width}
            bind:height={store.resolution.height}
            onresize={handleCanvasResize}
          >
            <SimCanvas
              bind:this={simCanvas}
              onCanvasDblClick={handleCanvasFocus}
            />
          </ResizableCanvas>
        </PanZoomViewport>
      </div>

      <!-- Info bar -->
      <div class="shrink-0 bg-white border-b border-black">
        <InfoBar />
      </div>

      <!-- Bottom Timeline -->
      <div class="shrink-0 bg-white">
        <BottomTimelineBar />
      </div>
    </div>

    <!-- RIGHT PANEL: Properties (Stacked) -->
    <div class="w-80 flex flex-col shrink-0 bg-neutral-100 overflow-y-auto">
      <div class="flex flex-col border-b border-black">
        <AccordionPanel title="Seed Text" open>
          <SeedPanel bind:this={seedPanel} onReseed={handleReseed} />
        </AccordionPanel>

        <AccordionPanel title="Advanced Parameters" open>
          <ParameterPanel />
        </AccordionPanel>

        <AccordionPanel title="Colors" open>
          <ColormapPicker />
        </AccordionPanel>

        <AccordionPanel title="Export">
          <ExportPanel {getSimulation} />
        </AccordionPanel>
      </div>
    </div>
  </div>
</div>
</Tooltip.Provider>
