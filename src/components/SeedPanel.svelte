<script lang="ts">
  import { store } from "$lib/store/simStore.svelte";
  import { FontLoader } from "$lib/seed/FontLoader";

  let { onReseed }: { onReseed: (font: any) => void } = $props();

  let fontLoader = new FontLoader();
  let fontName = $state("");

  function handleApply() {
    onReseed(fontLoader.getFont());
  }

  async function handleFontUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      await fontLoader.loadFromFile(file);
      fontName = file.name;
      onReseed(fontLoader.getFont());
    } catch (err) {
      console.error("Failed to load font:", err);
      fontName = "(error)";
    }
  }

  function clearFont() {
    fontLoader.clear();
    fontName = "";
  }
</script>

<div class="flex flex-col gap-3 p-3 border-t border-black">
  <h3 class="text-xs font-bold uppercase tracking-wider text-black">
    Seed Text
  </h3>

  <div class="flex gap-2 items-center">
    <input
      type="text"
      class="border border-black px-2 py-1 text-xs bg-white flex-1"
      bind:value={store.seedText}
      placeholder="Type text…"
    />
    <button
      class="border border-black bg-black text-white px-3 py-1 text-xs font-bold uppercase"
      onclick={handleApply}>Apply</button
    >
  </div>

  <div class="flex flex-col gap-0.5">
    <label
      class="text-xs text-black/60 flex justify-between"
      for="font-size-slider"
    >
      Size <span class="font-mono text-black">{store.seedFontSize}px</span>
    </label>
    <input
      id="font-size-slider"
      type="range"
      class="range range-xs"
      min="20"
      max="500"
      step="1"
      bind:value={store.seedFontSize}
    />
  </div>

  <div class="flex gap-2 items-center">
    <label
      class="border border-black px-2 py-1 text-xs bg-white flex-1 cursor-pointer hover:bg-base-200 truncate text-center"
    >
      {fontName || "Upload font (.ttf/.otf)"}
      <input
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        onchange={handleFontUpload}
        hidden
      />
    </label>
    {#if fontName}
      <button
        class="border border-black px-2 py-1 text-xs text-red-600 hover:bg-red-600 hover:text-white"
        onclick={clearFont}>✕</button
      >
    {/if}
  </div>
</div>
