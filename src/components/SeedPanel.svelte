<script lang="ts">
  import { store } from "$lib/store/simStore.svelte";
  import { FontLoader } from "$lib/seed/FontLoader";
  import ParamInput from "./ui/ParamInput.svelte";
  import Upload from "lucide-svelte/icons/upload";

  let { onReseed }: { onReseed: () => void } = $props();

  let fontLoader = new FontLoader();
  let autoApplyTimer: ReturnType<typeof setTimeout> | null = null;
  let textInputEl: HTMLInputElement;

  export function focusInput() {
    textInputEl?.focus();
    textInputEl?.select();
  }

  function handleApply() {
    onReseed();
  }

  async function handleFontUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const font = await fontLoader.loadFromFile(file);
      store.seedFont = font;
      store.seedFontName = file.name;
      onReseed();
    } catch (err) {
      console.error("Failed to load font:", err);
      store.seedFontName = "(error)";
    }
  }

  function clearFont() {
    store.seedFont = null;
    store.seedFontName = "";
    onReseed();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  }

  $effect(() => {
    store.seedFontSize;
    autoApplyTimer = setTimeout(onReseed, 160);
    return () => clearTimeout(autoApplyTimer ?? undefined);
  });
</script>

<div class="flex flex-col gap-3">
  <div class="flex gap-2 items-center">
    <input
      bind:this={textInputEl}
      id="seed-text-input"
      type="text"
      class="h-7 border border-black px-2 text-xs bg-white flex-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black"
      bind:value={store.seedText}
      placeholder="Type text…"
      onkeydown={handleKeyDown}
    />
    <button
      type="button"
      class="h-7 border border-black bg-black text-white px-3 text-xs font-bold uppercase hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black"
      onclick={handleApply}>Apply</button
    >
  </div>

  <ParamInput
    id="font-size-slider"
    label="Size"
    bind:value={store.seedFontSize}
    min={10}
    max={1000}
    step={1}
    suffix="px"
  />

  <div class="flex gap-2 items-center">
    <label
      class="h-7 border border-black px-2 text-xs bg-white flex-1 flex justify-center items-center gap-1.5 cursor-pointer hover:bg-neutral-100 truncate focus-within:ring-1 focus-within:ring-black"
    >
      <Upload class="w-3.5 h-3.5 opacity-70" />
      <span>{store.seedFontName || "Upload font (.ttf/.otf)"}</span>
      <input
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        onchange={handleFontUpload}
        hidden
      />
    </label>
    {#if store.seedFontName}
      <button
        type="button"
        class="w-7 h-7 flex items-center justify-center border border-black text-xs text-red-600 hover:bg-red-600 hover:text-white font-bold"
        onclick={clearFont}>✕</button
      >
    {/if}
  </div>
</div>
