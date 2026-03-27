<script lang="ts">
  import { onDestroy } from "svelte";
  import { store } from "$lib/store/simStore.svelte";
  import { ColormapRegistry } from "$lib/colormaps/ColormapRegistry";
  import type { GradientStop } from "$lib/store/simStore.svelte";
  import Tooltip from "./ui/Tooltip.svelte";

  const colormaps = ColormapRegistry.list();

  function rgbToHex(r: number, g: number, b: number): string {
    const rr = r.toString(16).padStart(2, "0");
    const gg = g.toString(16).padStart(2, "0");
    const bb = b.toString(16).padStart(2, "0");
    return `#${rr}${gg}${bb}`;
  }

  function sampleLUTColorHex(lut: Uint8Array, position: number): string {
    const idx = Math.max(0, Math.min(255, Math.round(position * 255)));
    const i = idx * 4;
    return rgbToHex(lut[i], lut[i + 1], lut[i + 2]);
  }

  function enableCustomGradient() {
    const sourceId = store.activeColormapId;
    if (sourceId !== "custom") {
      try {
        const lut = ColormapRegistry.get(sourceId).buildLUT();
        const seededStops = sortStops(store.customGradientStops).map((stop) => ({
          ...stop,
          color: sampleLUTColorHex(lut, stop.position),
        }));
        store.customGradientStops = seededStops;
      } catch {
        // Keep existing gradient stops if colormap lookup fails.
      }
    }
    store.activeColormapId = "custom";
  }

  function normalizeHex(hex: string): string {
    const trimmed = (hex || "").trim();
    return /^#[0-9a-fA-F]{6}$/.test(trimmed)
      ? trimmed.toLowerCase()
      : "#000000";
  }

  function updateGradientStop(index: number, value: string) {
    const next = [...store.customGradientStops];
    next[index] = {
      ...next[index],
      color: normalizeHex(value),
    };
    store.customGradientStops = next;
  }

  function clamp01(v: number): number {
    return Math.max(0, Math.min(1, v));
  }

  function sortStops(stops: GradientStop[]): GradientStop[] {
    return [...stops].sort((a, b) => a.position - b.position);
  }

  function sortedStopsWithIndex(stops: GradientStop[]) {
    return stops
      .map((stop, index) => ({ stop, index }))
      .sort((a, b) => a.stop.position - b.stop.position);
  }

  let previewEl = $state<HTMLDivElement | undefined>(undefined);
  let draggingStopIndex = $state<number | null>(null);
  let selectedStopIndex = $state(0);

  function applyStopPosition(index: number, position01: number) {
    const next = [...store.customGradientStops];
    if (!next[index]) return;
    next[index] = {
      ...next[index],
      position: clamp01(position01),
    };
    store.customGradientStops = next;
    selectedStopIndex = index;
  }


  function positionFromEvent(e: MouseEvent): number {
    if (!previewEl) return 0;
    const rect = previewEl.getBoundingClientRect();
    return clamp01((e.clientX - rect.left) / Math.max(1, rect.width));
  }

  function handleWindowMouseMove(e: MouseEvent) {
    if (draggingStopIndex === null) return;
    applyStopPosition(draggingStopIndex, positionFromEvent(e));
  }

  function handleWindowMouseUp() {
    draggingStopIndex = null;
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
  }

  function startStopDrag(index: number, e: MouseEvent) {
    e.preventDefault();
    selectedStopIndex = index;
    draggingStopIndex = index;
    applyStopPosition(index, positionFromEvent(e));
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
  }

  onDestroy(() => {
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
  });

  function addGradientStop() {
    const base = [...store.customGradientStops];
    if (base.length >= 8) return;

    const selected =
      base[Math.max(0, Math.min(selectedStopIndex, base.length - 1))] ??
      base[base.length - 1];
    const midPos = selected ? clamp01(selected.position + 0.08) : 0.5;

    const mid: GradientStop = {
      color: "#ffffff",
      position: midPos,
    };
    const next = [...base, mid];
    store.customGradientStops = next;
    selectedStopIndex = next.length - 1;
  }

  function removeGradientStop(index: number) {
    if (store.customGradientStops.length <= 2) return;
    const next = store.customGradientStops.filter((_, i) => i !== index);
    store.customGradientStops = next;
    selectedStopIndex = Math.max(
      0,
      Math.min(selectedStopIndex, next.length - 1),
    );
  }

  const sortedStops = $derived(sortedStopsWithIndex(store.customGradientStops));

  const gradientCss = $derived(
    `linear-gradient(to right, ${sortedStops
      .map(({ stop }) => `${stop.color} ${Math.round(stop.position * 100)}%`)
      .join(", ")})`,
  );

  const selectItems = [
    { value: "custom", label: "Custom Gradient" },
    ...colormaps.map((cm) => ({ value: cm.id, label: cm.label })),
  ];

  function handleColormapChange(v: string | undefined) {
    if (!v) return;
    if (v === "custom" && store.activeColormapId !== "custom") {
      enableCustomGradient();
    } else {
      store.activeColormapId = v;
    }
  }
</script>

<div class="flex flex-col gap-3">
  <div class="flex flex-col gap-2">
    <div class="grid grid-cols-2 gap-1.5">
      {#each selectItems as item}
        <button
          type="button"
          class="border border-black px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-left {store.activeColormapId === item.value ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100/50'}"
          onclick={() => handleColormapChange(item.value)}
        >
          {item.label}
        </button>
      {/each}
    </div>
  </div>

  {#if store.activeColormapId === "custom"}
    <div class="flex flex-col gap-3">
      <div

        bind:this={previewEl}
        class="relative h-10 border border-black bg-white select-none"
        style={`background: ${gradientCss};`}
      >
        {#each sortedStops as item, i}
          <Tooltip content={`Stop ${i + 1}: ${Math.round(item.stop.position * 100)}%`} side="top">
            <button
              type="button"
              class="absolute top-0 bottom-0 -translate-x-1/2 w-4 group"
              style={`left: ${item.stop.position * 100}%;`}
              onmousedown={(e) => startStopDrag(item.index, e)}
              onclick={() => (selectedStopIndex = item.index)}
              aria-label={`Gradient stop ${i + 1} at ${Math.round(item.stop.position * 100)}%`}
            >
              <span
                class="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px {selectedStopIndex ===
                item.index
                  ? 'bg-black'
                  : 'bg-neutral-700 group-hover:bg-black'}"
              ></span>
              <span
                class="pointer-events-none absolute left-1/2 -translate-x-1/2 -bottom-0.5 w-2 h-2 border border-black {selectedStopIndex ===
                item.index
                  ? 'bg-black'
                  : 'bg-white group-hover:bg-black'}"
              ></span>
            </button>
          </Tooltip>
        {/each}
      </div>

      <div class="flex flex-col gap-1.5 w-full">
        {#each sortedStops as item, i}
          <div class="flex items-center gap-1.5 w-full">
            <input
              type="color"
              value={item.stop.color}
              class="w-7 h-6 border border-black p-0 shrink-0 cursor-pointer"
              onchange={(e) =>
                updateGradientStop(
                  item.index,
                  (e.target as HTMLInputElement).value,
                  )}
            />
            <input
              type="text"
              value={item.stop.color}
              class="border border-black px-1.5 py-1 text-[11px] font-mono flex-1 min-w-0"
              onblur={(e) =>
                updateGradientStop(
                  item.index,
                  (e.target as HTMLInputElement).value,
                )}
              onkeydown={(e) => {
                if (e.key === "Enter") {
                  updateGradientStop(
                    item.index,
                    (e.target as HTMLInputElement).value,
                  );
                }
              }}
              placeholder="#RRGGBB"
            />
            <span class="text-[10px] text-black/60 shrink-0">pos</span>
            <Tooltip content="Stop position %" side="top">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={Math.round(item.stop.position * 100)}
                class="border border-black px-1 py-1 text-[11px] w-11 shrink-0 text-center"
                onblur={(e) =>
                  applyStopPosition(
                    item.index,
                    Number((e.target as HTMLInputElement).value) / 100,
                  )}
                onkeydown={(e) => {
                  if (e.key === "Enter") {
                    applyStopPosition(
                      item.index,
                      Number((e.target as HTMLInputElement).value) / 100,
                    );
                  }
                }}
              />
            </Tooltip>
            <Tooltip content="Remove stop" side="top">
              <button
                type="button"
                class="border border-black px-2 py-1 text-xs font-bold uppercase hover:bg-black hover:text-white disabled:opacity-40 shrink-0"
                onclick={() => removeGradientStop(item.index)}
                disabled={store.customGradientStops.length <= 2}
              >
                −
              </button>
            </Tooltip>
          </div>
        {/each}
      </div>

      <button
        type="button"
        class="border border-black px-2 py-1 text-xs font-bold uppercase hover:bg-black hover:text-white disabled:opacity-40"
        onclick={addGradientStop}
        disabled={store.customGradientStops.length >= 8}
      >
        Add Color Stop
      </button>
    </div>
  {/if}
</div>
