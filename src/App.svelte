<script lang="ts">
  import SimCanvas from "./components/SimCanvas.svelte";
  import ResizableCanvas from "./components/ResizableCanvas.svelte";
  import LayerStrip from "./components/LayerStrip.svelte";
  import InfoBar from "./components/InfoBar.svelte";
  import ViewportToolbar from "./components/ViewportToolbar.svelte";
  import ParameterPanel from "./components/ParameterPanel.svelte";
  import SeedPanel from "./components/SeedPanel.svelte";
  import ColormapPicker from "./components/ColormapPicker.svelte";
  import ExportPanel from "./components/ExportPanel.svelte";
  import { GrayScott } from "$lib/simulation/GrayScott";
  import { store } from "$lib/store/simStore.svelte";
  import { onMount, onDestroy } from "svelte";

  let simCanvas: SimCanvas;
  let activeTab = $state<"text" | "colors" | "export">("text");

  // Track resolution changes for resize
  let lastWidth = store.resolution.width;
  let lastHeight = store.resolution.height;

  function handleReseed(font: any) {
    if (font) {
      simCanvas?.reseedWithFont(font);
    } else {
      simCanvas?.reseed();
    }
  }

  function getSimulation(): GrayScott | null {
    return simCanvas?.getSimulation() ?? null;
  }

  // Handle canvas resize from ResizableCanvas handles
  function handleCanvasResize(w: number, h: number) {
    simCanvas?.resizeSimulation(w, h);
    lastWidth = w;
    lastHeight = h;
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

  // Viewport toolbar handlers
  function handleMin() {
    handleCanvasResize(64, 64);
    store.resolution.width = 64;
    store.resolution.height = 64;
  }

  function handleMax() {
    // Use viewport-relative size
    const w = Math.min(1024, Math.floor(window.innerWidth * 0.55));
    const h = Math.min(1024, Math.floor(window.innerHeight * 0.65));
    handleCanvasResize(w, h);
    store.resolution.width = w;
    store.resolution.height = h;
  }

  function handleSave() {
    const sim = getSimulation();
    if (!sim) return;
    // Export current frame as PNG
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `rd-frame-${Date.now()}.png`;
    a.click();
  }

  function handlePause() {
    store.isRunning = !store.isRunning;
  }

  function handleLoop() {
    simCanvas?.reseed();
  }

  function handleTrash() {
    const sim = getSimulation();
    if (sim) {
      sim.resize(store.resolution.width, store.resolution.height);
      store.iterationCount = 0;
    }
  }

  // Keyboard shortcuts
  function handleKeyDown(e: KeyboardEvent) {
    // Don't trigger when typing in inputs
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (e.code === "Space") {
      e.preventDefault();
      handlePause();
    } else if (e.code === "KeyR") {
      e.preventDefault();
      handleLoop();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
  });

  onDestroy(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });
</script>

<div class="h-full flex flex-col bg-white overflow-hidden">
  <!-- Header -->
  <header class="flex items-center px-4 py-2 border-b border-black shrink-0">
    <h1 class="text-lg font-black text-black tracking-tight">∇ Nabla Type</h1>
  </header>

  <!-- Main two-panel layout -->
  <div class="flex flex-1 min-h-0 overflow-hidden">
    <!-- LEFT PANEL: Viewport -->
    <div class="flex-1 flex flex-col min-w-0 border-r border-black">
      <!-- Canvas area with layer strip -->
      <div class="flex flex-1 min-h-0 overflow-auto bg-neutral-100">
        <!-- Scrollable canvas viewport -->
        <div class="flex-1 grid place-items-center overflow-auto p-4">
          <ResizableCanvas
            bind:width={store.resolution.width}
            bind:height={store.resolution.height}
            onresize={handleCanvasResize}
          >
            <SimCanvas bind:this={simCanvas} />
          </ResizableCanvas>
        </div>

        <!-- Layer side-strip -->
        <LayerStrip />
      </div>

      <!-- Info bar -->
      <div class="border-t border-base-300 shrink-0">
        <InfoBar />
      </div>

      <!-- Viewport toolbars -->
      <div class="border-t border-base-300 shrink-0">
        <ViewportToolbar
          onmin={handleMin}
          onmax={handleMax}
          onsave={handleSave}
          onpause={handlePause}
          onloop={handleLoop}
          ontrash={handleTrash}
        />
      </div>
    </div>

    <!-- RIGHT PANEL: Parameters + Tabs -->
    <div class="w-80 flex flex-col shrink-0 bg-white">
      <!-- Diffusion Parameters -->
      <div class="flex-1 min-h-0 overflow-y-auto p-3">
        <ParameterPanel />
      </div>

      <!-- Tab content area -->
      <div class="border-t border-black">
        <!-- Tabs -->
        <div class="flex border-b border-black">
          <button
            class="flex-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wide border-r border-black {activeTab ===
            'text'
              ? 'bg-black text-white'
              : 'bg-white text-black hover:bg-neutral-100'}"
            onclick={() => (activeTab = "text")}
          >
            Text
          </button>
          <button
            class="flex-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wide border-r border-black {activeTab ===
            'colors'
              ? 'bg-black text-white'
              : 'bg-white text-black hover:bg-neutral-100'}"
            onclick={() => (activeTab = "colors")}
          >
            Colors
          </button>
          <button
            class="flex-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wide {activeTab ===
            'export'
              ? 'bg-black text-white'
              : 'bg-white text-black hover:bg-neutral-100'}"
            onclick={() => (activeTab = "export")}
          >
            Export
          </button>
        </div>

        <!-- Tab content -->
        <div class="max-h-48 overflow-y-auto">
          {#if activeTab === "text"}
            <SeedPanel onReseed={handleReseed} />
          {:else if activeTab === "colors"}
            <ColormapPicker />
          {:else if activeTab === "export"}
            <ExportPanel {getSimulation} />
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>
