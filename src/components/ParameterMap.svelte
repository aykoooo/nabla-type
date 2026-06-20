<script lang="ts">
  import { onMount } from "svelte";
  import { store, pushParamHistory } from "$lib/store/simStore.svelte";
  import type { SimParams } from "$lib/simulation/presets";
  import { loadParameterMap, type ParameterMapData } from "$lib/map/loadParameterMap";
  import { buildActiveLUT } from "$lib/colormaps/buildLUT";
  import { buildParameterMapDefaultLUT } from "$lib/colormaps/maps/parameterMapDefault";
  import {
    pixelToWarpedParams,
    warpedParamsToPixel,
    FEED_MIN,
    FEED_MAX,
    KILL_ABS_MIN,
    KILL_ABS_MAX,
  } from "$lib/warp/karlSimsWarp";
  import MathInput from "./ui/MathInput.svelte";
  import CrosshairMarker from "./ui/CrosshairMarker.svelte";

  let { src }: { src: string } = $props();

  let wrapperEl = $state<HTMLDivElement | null>(null);
  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let mapData = $state<ParameterMapData | null>(null);
  let imageDataCache: ImageData | null = null;
  let isLoading = $state(true);
  let loadError = $state("");
  let hoverFeed = $state(store.params.feed);
  let hoverKill = $state(store.params.kill);
  let isHovering = $state(false);
  let dragging = $state(false);

  const NATIVE_W = 512;
  const NATIVE_H = 512;

  const crossPos = $derived.by(() => {
    if (!mapData) return { u: 0.5, v: 0.5 };
    return warpedParamsToPixel(store.params.feed, store.params.kill);
  });

  const feedPct = $derived.by(() => {
    const t = (store.params.feed - FEED_MIN) / (FEED_MAX - FEED_MIN);
    return Math.max(0, Math.min(100, t * 100));
  });

  const killPct = $derived.by(() => {
    const t = (store.params.kill - KILL_ABS_MIN) / (KILL_ABS_MAX - KILL_ABS_MIN);
    return Math.max(0, Math.min(100, t * 100));
  });

  async function loadMap() {
    try {
      isLoading = true;
      loadError = "";
      mapData = await loadParameterMap(src);
    } catch (e) {
      loadError = (e as Error).message;
    } finally {
      isLoading = false;
    }
  }

  function renderMap() {
    if (!mapData || !canvasEl) return;
    const ctx = canvasEl.getContext("2d")!;

    const previewActive = store.colorFocused;
    const lut = previewActive
      ? buildActiveLUT(store.activeColormapId, store.customGradientStops) ?? buildParameterMapDefaultLUT()
      : buildParameterMapDefaultLUT();

    const pixels = mapData.pixels;
    const w = mapData.width;
    const h = mapData.height;

    if (!imageDataCache || imageDataCache.width !== w || imageDataCache.height !== h) {
      imageDataCache = ctx.createImageData(w, h);
    }
    const id = imageDataCache;

    for (let py = 0; py < h; py++) {
      const srcRow = h - 1 - py;
      for (let px = 0; px < w; px++) {
        const v = pixels[srcRow * w + px];
        const idx = v * 4;
        const di = (py * w + px) * 4;
        id.data[di + 0] = lut[idx + 0];
        id.data[di + 1] = lut[idx + 1];
        id.data[di + 2] = lut[idx + 2];
        id.data[di + 3] = 255;
      }
    }

    ctx.putImageData(id, 0, 0);
  }

  $effect(() => {
    const _canvas = canvasEl;
    const _map = mapData;
    const _focused = store.colorFocused;
    const _activeId = store.activeColormapId;
    if (_canvas && _map) renderMap();
  });

  let colormapDebounceTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  $effect(() => {
    store.customGradientStops;
    clearTimeout(colormapDebounceTimer);
    colormapDebounceTimer = setTimeout(() => {
      if (canvasEl && mapData) renderMap();
    }, 50);
    return () => clearTimeout(colormapDebounceTimer);
  });

  function getPointerPos(e: PointerEvent | MouseEvent): { u: number; v: number } {
    if (!wrapperEl) return { u: 0.5, v: 0.5 };
    const u = Math.max(0, Math.min(1, e.offsetX / wrapperEl.clientWidth));
    const v = Math.max(0, Math.min(1, e.offsetY / wrapperEl.clientHeight));
    return { u, v };
  }

  function pushBeforeChange(nextParams: SimParams) {
    pushParamHistory(nextParams);
  }

  function applyPointerParams(e: PointerEvent | MouseEvent) {
    const { u, v } = getPointerPos(e);
    const { feed, kill } = pixelToWarpedParams(u, v);
    store.params.feed = feed;
    store.params.kill = kill;
    hoverFeed = feed;
    hoverKill = kill;
  }

  function handlePointerDown(e: PointerEvent) {
    if (!wrapperEl) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging = true;
    pushBeforeChange(store.params);
    applyPointerParams(e);
  }

  function handlePointerMove(e: PointerEvent) {
    if (dragging) {
      e.preventDefault();
      applyPointerParams(e);
    } else {
      const { u, v } = getPointerPos(e);
      const { feed, kill } = pixelToWarpedParams(u, v);
      hoverFeed = feed;
      hoverKill = kill;
      isHovering = true;
    }
  }

  function handlePointerUp(e: PointerEvent) {
    if (dragging) {
      dragging = false;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }

  function handlePointerLeave() {
    if (!dragging) isHovering = false;
  }

  // Keyboard nudge.
  const KEYBOARD_STEP = 0.001;
  function handleKeyDown(e: KeyboardEvent) {
    if (!e.key.startsWith("Arrow")) return;
    e.preventDefault();
    e.stopPropagation();

    const prev = { ...store.params } as SimParams;
    const step = e.shiftKey ? KEYBOARD_STEP * 5 : e.ctrlKey || e.metaKey ? KEYBOARD_STEP * 0.2 : KEYBOARD_STEP;

    let nextFeed = prev.feed;
    let nextKill = prev.kill;

    if (e.key === "ArrowUp") nextFeed += step;
    if (e.key === "ArrowDown") nextFeed -= step;
    if (e.key === "ArrowRight") nextKill += step;
    if (e.key === "ArrowLeft") nextKill -= step;

    nextFeed = Math.max(FEED_MIN, Math.min(FEED_MAX, nextFeed));
    nextKill = Math.max(KILL_ABS_MIN, Math.min(KILL_ABS_MAX, nextKill));

    if (nextFeed !== prev.feed || nextKill !== prev.kill) {
      pushBeforeChange(prev);
      store.params.feed = nextFeed;
      store.params.kill = nextKill;
    }
  }

  // Manual input editing: push previous params to history when blur commits a change.
  let feedBeforeEdit = $state(store.params.feed);
  function onFeedFocus() {
    feedBeforeEdit = store.params.feed;
  }
  function onFeedBlur() {
    if (store.params.feed !== feedBeforeEdit) {
      pushBeforeChange({ ...store.params, feed: feedBeforeEdit });
    }
  }

  let killBeforeEdit = $state(store.params.kill);
  function onKillFocus() {
    killBeforeEdit = store.params.kill;
  }
  function onKillBlur() {
    if (store.params.kill !== killBeforeEdit) {
      pushBeforeChange({ ...store.params, kill: killBeforeEdit });
    }
  }

  onMount(() => {
    loadMap();
  });
</script>

<div class="flex flex-col gap-2 select-none">
  {#if isLoading}
    <div class="aspect-square border border-black bg-neutral-100 flex items-center justify-center">
      <span class="text-[10px] uppercase font-bold text-neutral-400 animate-pulse">Loading map…</span>
    </div>
  {:else if loadError}
    <div class="aspect-square border border-black bg-red-50 flex items-center justify-center p-2 text-center">
      <span class="text-[10px] uppercase font-bold text-red-600 leading-tight">{loadError}</span>
    </div>
  {:else}
    <div
      id="parameter-map"
      bind:this={wrapperEl}
      class="relative aspect-square w-full border border-black cursor-crosshair touch-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
      role="button"
      aria-label="Gray-Scott parameter map. Drag or use arrow keys to adjust feed and kill rates."
      tabindex="0"
      onpointerdown={handlePointerDown}
      onpointermove={handlePointerMove}
      onpointerup={handlePointerUp}
      onpointercancel={handlePointerUp}
      onpointerleave={handlePointerLeave}
      onkeydown={handleKeyDown}
    >
      <canvas
        bind:this={canvasEl}
        width={NATIVE_W}
        height={NATIVE_H}
        class="w-full h-full block"
        style="image-rendering: crisp-edges;"
      ></canvas>

      {#if mapData}
        {@const left = crossPos.u * 100}
        {@const top = crossPos.v * 100}
        <div
          class="absolute pointer-events-none"
          style="left: {left}%; top: {top}%; width: 16px; height: 16px; transform: translate(-50%, -50%);"
        >
          <CrosshairMarker size={16} />
        </div>
      {/if}
    </div>

    <div class="flex flex-col gap-1.5" aria-live="polite" aria-atomic="false">
      <!-- Feed row -->
      <div class="flex flex-col gap-0.5">
        <div class="flex justify-between items-center">
          <label class="text-[10px] font-bold uppercase text-black" for="param-map-feed">Feed</label>
          <div class="flex items-center gap-1.5">
            <MathInput
              id="param-map-feed"
              bind:value={store.params.feed}
              decimals={4}
              class="font-mono tabular-nums text-brutal-secondary font-medium text-right bg-transparent hover:bg-brutal-hover focus-visible:bg-brutal-hover focus-visible:outline-none px-1 h-5 rounded-sm w-16 text-[10px]"
              onfocus={onFeedFocus}
              onblur={onFeedBlur}
            />
            {#if isHovering && !dragging}
              <span class="text-[10px] text-neutral-400 tabular-nums font-mono">→ {hoverFeed.toFixed(4)}</span>
            {/if}
          </div>
        </div>
        <div class="h-1 bg-neutral-200 relative overflow-hidden">
          <div class="absolute left-0 top-0 bottom-0 bg-black" style="width: {feedPct}%"></div>
        </div>
      </div>

      <!-- Kill row -->
      <div class="flex flex-col gap-0.5">
        <div class="flex justify-between items-center">
          <label class="text-[10px] font-bold uppercase text-black" for="param-map-kill">Kill</label>
          <div class="flex items-center gap-1.5">
            <MathInput
              id="param-map-kill"
              bind:value={store.params.kill}
              decimals={4}
              class="font-mono tabular-nums text-brutal-secondary font-medium text-right bg-transparent hover:bg-brutal-hover focus-visible:bg-brutal-hover focus-visible:outline-none px-1 h-5 rounded-sm w-16 text-[10px]"
              onfocus={onKillFocus}
              onblur={onKillBlur}
            />
            {#if isHovering && !dragging}
              <span class="text-[10px] text-neutral-400 tabular-nums font-mono">→ {hoverKill.toFixed(4)}</span>
            {/if}
          </div>
        </div>
        <div class="h-1 bg-neutral-200 relative overflow-hidden">
          <div class="absolute left-0 top-0 bottom-0 bg-black" style="width: {killPct}%"></div>
        </div>
      </div>
    </div>
  {/if}
</div>
