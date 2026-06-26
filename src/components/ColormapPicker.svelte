<script lang="ts">
  import { Popover } from "bits-ui";
  import { store } from "$lib/store/simStore.svelte";
  import { ColormapRegistry } from "$lib/colormaps/ColormapRegistry";
  import { type ColormapSpec } from "$lib/colormaps/spec";
  import type { GradientStop } from "$lib/store/simStore.svelte";
  import { blurActiveElement } from "$lib/utils/focus";
  import Tooltip from "./ui/Tooltip.svelte";

  const PRESET_ORDER = [
    "blackwhite",
    "tulip",
    "inkwell",
    "petri",
    "aurora",
    "magma",
    "cinders",
    "ochre",
    "glitch",
    "iridescent",
    "rainbow",
    "acid",
    "prism",
  ];

  const presets = PRESET_ORDER.map((id) => ColormapRegistry.get(id));

  let popoverOpen = $state(false);

  function buildGradientCss(spec: ColormapSpec): string {
    const stops = [...spec.stops].sort((a, b) => a.pos - b.pos);
    if (stops.length === 0) {
      return "linear-gradient(to right, #000000, #000000)";
    }

    if (spec.mode === "step") {
      const pieces: string[] = [];
      for (let i = 0; i < stops.length; i++) {
        const startPos = i === 0 ? 0 : stops[i].pos;
        const endPos = i < stops.length - 1 ? stops[i + 1].pos : 1;
        pieces.push(`${stops[i].color} ${Math.round(startPos * 100)}%`);
        pieces.push(`${stops[i].color} ${Math.round(endPos * 100)}%`);
      }
      return `linear-gradient(to right, ${pieces.join(", ")})`;
    }

    const stopsCss = stops
      .map((s) => `${s.color} ${Math.round(s.pos * 100)}%`)
      .join(", ");
    return `linear-gradient(to right, ${stopsCss})`;
  }

  function seedFromSource() {
    const sourceId = store.customSeedSourceId ?? "blackwhite";
    if (sourceId === "custom") return;
    try {
      const spec = ColormapRegistry.get(sourceId);
      const all = spec.stops;
      const picked =
        all.length <= 8
          ? all
          : Array.from({ length: 8 }, (_, i) =>
              all[Math.round((i / 7) * (all.length - 1))],
            );
      const next = picked
        .map((s) => ({
          color: s.color,
          position: Math.max(0, Math.min(1, s.pos)),
        }))
        .sort((a, b) => a.position - b.position);
      if (next.length >= 2) {
        store.customGradientStops = next;
      }
    } catch {
      // Ignore seeding errors.
    }
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

  $effect(() => {
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
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

  function selectPreset(id: string) {
    store.activeColormapId = id;
    store.customSeedSourceId = id;
    popoverOpen = false;
  }

  $effect(() => {
    if (popoverOpen) {
      store.activeColormapId = "custom";
    }
  });

  function seedSourceLabelFor(id: string | null | undefined): string {
    const sourceId = id && id !== "custom" ? id : "blackwhite";
    try {
      return ColormapRegistry.get(sourceId).label;
    } catch {
      return ColormapRegistry.get("blackwhite").label;
    }
  }

  const seedSourceLabel = $derived(
    seedSourceLabelFor(store.customSeedSourceId),
  );
</script>

<div class="flex flex-col gap-3">
  <div class="grid grid-cols-2 gap-1.5">
    <Popover.Root
      bind:open={popoverOpen}
      onOpenChange={(open) => {
        if (!open) {
          // Defer blur so bits-ui's focus restoration runs first.
          setTimeout(blurActiveElement, 0);
        }
      }}
    >
      <Popover.Trigger>
        {#snippet child({ props })}
          <button
            type="button"
            {...props}
            class="flex flex-col gap-1 border border-black px-2 py-2 text-left {store.activeColormapId ===
            'custom'
              ? 'bg-black text-white'
              : 'bg-white text-black hover:bg-neutral-100/50'}"
            aria-pressed={store.activeColormapId === "custom"}
          >
            <span class="text-[10px] font-bold uppercase tracking-wider"
              >Custom</span
            >
            <span
              class="h-1 w-full"
              style="background: {gradientCss};"
              aria-hidden="true"
            ></span>
          </button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="left"
          sideOffset={12}
          class="z-50 w-80 border border-black bg-white p-3 shadow-none focus:outline-none"
        >
          <div class="mb-3 flex items-center justify-between gap-2">
            <span class="text-[10px] font-bold uppercase tracking-wider"
              >Custom Gradient</span
            >
            <button
              type="button"
              class="border border-black px-2 py-1 text-[10px] font-bold uppercase hover:bg-black hover:text-white disabled:opacity-40"
              onclick={(e) => {
                seedFromSource();
                (e.currentTarget as HTMLButtonElement).blur();
              }}
            >
              Seed from {seedSourceLabel}
            </button>
          </div>

          <div class="flex flex-col gap-3">
            <div
              bind:this={previewEl}
              class="relative h-10 select-none border border-black bg-white"
              style={`background: ${gradientCss};`}
            >
              {#each sortedStops as item, i}
                <Tooltip
                  content={`Stop ${i + 1}: ${Math.round(item.stop.position * 100)}%`}
                  side="top"
                >
                  <button
                    type="button"
                    class="absolute top-0 bottom-0 w-4 -translate-x-1/2 hover:z-50"
                    style={`left: ${item.stop.position * 100}%;`}
                    onmousedown={(e) => startStopDrag(item.index, e)}
                    onclick={() => (selectedStopIndex = item.index)}
                    aria-label={`Gradient stop ${i + 1} at ${Math.round(item.stop.position * 100)}%`}
                  >
                    <span
                      class="pointer-events-none absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 {selectedStopIndex ===
                      item.index
                        ? 'bg-black'
                        : 'bg-neutral-700 hover:bg-black'}"
                    ></span>
                    <span
                      class="pointer-events-none absolute -bottom-0.5 left-1/2 h-2 w-2 -translate-x-1/2 border border-black {selectedStopIndex ===
                      item.index
                        ? 'bg-black'
                        : 'bg-white hover:bg-black'}"
                    ></span>
                  </button>
                </Tooltip>
              {/each}
            </div>

            <div class="flex w-full flex-col gap-1.5">
              {#each sortedStops as item, i}
                <div class="flex w-full items-center gap-1.5">
                  <input
                    type="color"
                    value={item.stop.color}
                    class="h-6 w-7 shrink-0 cursor-pointer border border-black p-0"
                    onchange={(e) =>
                      updateGradientStop(
                        item.index,
                        (e.target as HTMLInputElement).value,
                      )}
                  />
                  <input
                    type="text"
                    value={item.stop.color}
                    class="min-w-0 flex-1 border border-black px-1.5 py-1 font-mono text-[11px]"
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
                  <span class="shrink-0 text-[10px] text-brutal-secondary"
                    >pos</span
                  >
                  <Tooltip content="Stop position %" side="top">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(item.stop.position * 100)}
                      class="w-11 shrink-0 border border-black px-1 py-1 text-center text-[11px]"
                      onblur={(e) => {
                        const value = Number(
                          (e.target as HTMLInputElement).value,
                        );
                        if (Number.isFinite(value)) {
                          applyStopPosition(item.index, value / 100);
                        }
                      }}
                      onkeydown={(e) => {
                        if (e.key === "Enter") {
                          const value = Number(
                            (e.target as HTMLInputElement).value,
                          );
                          if (Number.isFinite(value)) {
                            applyStopPosition(item.index, value / 100);
                          }
                        }
                      }}
                    />
                  </Tooltip>
                  <Tooltip content="Remove stop" side="top">
                    <button
                      type="button"
                      class="shrink-0 border border-black px-2 py-1 text-xs font-bold uppercase hover:bg-black hover:text-white disabled:opacity-40"
                      onclick={() => removeGradientStop(item.index)}
                      disabled={store.customGradientStops.length <= 2}
                    >
                      −
                    </button>
                  </Tooltip>
                </div>
              {/each}
            </div>

            <div class="flex gap-1.5">
              <button
                type="button"
                class="flex-1 border border-black px-2 py-1 text-xs font-bold uppercase hover:bg-black hover:text-white disabled:opacity-40"
                onclick={addGradientStop}
                disabled={store.customGradientStops.length >= 8}
              >
                Add Color Stop
              </button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>

    {#each presets as cm}
      <button
        type="button"
        class="flex flex-col gap-1 border border-black px-2 py-2 text-left {store.activeColormapId ===
        cm.id
          ? 'bg-black text-white'
          : 'bg-white text-black hover:bg-neutral-100/50'}"
        onclick={() => selectPreset(cm.id)}
        aria-pressed={store.activeColormapId === cm.id}
      >
        <span class="text-[10px] font-bold uppercase tracking-wider"
          >{cm.label}</span
        >
        <span
          class="h-1 w-full"
          style="background: {buildGradientCss(cm)};"
          aria-hidden="true"
        ></span>
      </button>
    {/each}
  </div>
</div>
