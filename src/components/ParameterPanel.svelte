<script lang="ts">
  import { store } from "$lib/store/simStore.svelte";
  import { onMount } from "svelte";
  import PearsonMap from "./PearsonMap.svelte";
  import {
    cloneParams,
    getAllPresetNames,
    getPresetByName,
    loadUserPresets,
    paramsEqualRounded,
    round4,
    saveUserPreset,
  } from "$lib/store/presetStore";

  let pearsonOpen = $state(false);
  let savePresetName = $state("");
  let sectionOpen = $state({ presets: true, core: true, timing: true });

  const presetNames = $derived(getAllPresetNames(store.userPresets));

  function applyPresetByName(name: string) {
    const preset = getPresetByName(name, store.userPresets);
    if (!preset) return;
    store.activePreset = name;
    store.params.feed = preset.feed;
    store.params.kill = preset.kill;
    store.params.da = preset.da;
    store.params.db = preset.db;
    store.params.dt = preset.dt;
    store.params.stepsPerFrame = preset.stepsPerFrame;
    store.baselineParams = cloneParams(preset);
  }

  function applyPreset(e: Event) {
    const select = e.target as HTMLSelectElement;
    applyPresetByName(select.value);
  }

  function cyclePreset(direction: -1 | 1) {
    if (presetNames.length === 0) return;
    const idx = presetNames.indexOf(store.activePreset);
    const start = idx >= 0 ? idx : 0;
    const next = (start + direction + presetNames.length) % presetNames.length;
    applyPresetByName(presetNames[next]);
  }

  function setParam(name: keyof typeof store.params, e: Event) {
    const raw = Number((e.target as HTMLInputElement).value);
    if (name === "stepsPerFrame") {
      store.params.stepsPerFrame = Math.max(1, Math.min(16, Math.round(raw)));
      return;
    }
    store.params[name] = raw;
  }

  function saveCurrentPreset() {
    const presetName = savePresetName.trim();
    if (!presetName) return;
    store.userPresets = saveUserPreset(
      presetName,
      store.params,
      store.userPresets,
    );
    applyPresetByName(presetName);
    savePresetName = "";
  }

  function resetToBaseline() {
    applyPresetByName(store.activePreset);
  }

  function resetSingleParam(name: keyof typeof store.params) {
    store.params[name] = store.baselineParams[name];
  }

  function isParamDirty(name: keyof typeof store.params): boolean {
    return round4(store.params[name]) !== round4(store.baselineParams[name]);
  }

  function toggleSection(section: keyof typeof sectionOpen) {
    sectionOpen[section] = !sectionOpen[section];
  }

  const paramsDirty = $derived(
    !paramsEqualRounded(store.params, store.baselineParams),
  );

  onMount(() => {
    store.userPresets = loadUserPresets();
    applyPresetByName(store.activePreset);
  });
</script>

<div class="flex flex-col gap-3 h-full">
  <h3 class="text-xs font-bold uppercase tracking-wider text-black">
    Diffusion Parameters
  </h3>

  <!-- Presets -->
  <div class="border border-black">
    <button
      type="button"
      class="w-full text-left px-2 py-1 text-xs font-bold uppercase tracking-wide bg-neutral-50 border-b border-black"
      onclick={() => toggleSection("presets")}
    >
      Presets {sectionOpen.presets ? "−" : "+"}
    </button>
    {#if sectionOpen.presets}
      <div class="p-2 flex flex-col gap-2">
        <div class="flex gap-1">
          <button
            type="button"
            class="border border-black px-2 py-1 text-xs font-bold hover:bg-black hover:text-white"
            onclick={() => cyclePreset(-1)}
          >
            &lt;
          </button>
          <select
            class="border border-black px-2 py-1 text-xs bg-white w-full"
            value={store.activePreset}
            onchange={applyPreset}
          >
            {#each presetNames as name}
              <option value={name}>{name}</option>
            {/each}
          </select>
          <button
            type="button"
            class="border border-black px-2 py-1 text-xs font-bold hover:bg-black hover:text-white"
            onclick={() => cyclePreset(1)}
          >
            &gt;
          </button>
        </div>

        <div class="flex gap-1">
          <input
            class="border border-black px-2 py-1 text-xs w-full"
            placeholder="New preset name"
            bind:value={savePresetName}
            onkeydown={(e) => e.key === "Enter" && saveCurrentPreset()}
          />
          <button
            type="button"
            class="border border-black bg-black text-white px-2 py-1 text-xs font-bold uppercase"
            onclick={saveCurrentPreset}
          >
            Save
          </button>
        </div>

        {#if paramsDirty}
          <button
            type="button"
            class="border border-black bg-white text-black px-2 py-1 text-xs font-bold uppercase hover:bg-black hover:text-white"
            onclick={resetToBaseline}
          >
            Reset all
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Params -->
  <div class="border border-black">
    <button
      type="button"
      class="w-full text-left px-2 py-1 text-xs font-bold uppercase tracking-wide bg-neutral-50 border-b border-black"
      onclick={() => toggleSection("core")}
    >
      Diffusion {sectionOpen.core ? "−" : "+"}
    </button>
    {#if sectionOpen.core}
      <div class="p-2 flex flex-col gap-2">
        <div class="flex flex-col gap-0.5">
          <label
            class="text-xs text-black/60 flex justify-between items-center"
            for="feed-slider"
          >
            <span>Feed</span>
            <span class="flex items-center gap-1">
              <span class="font-mono text-black">{store.params.feed.toFixed(4)}</span>
              {#if isParamDirty('feed')}
                <button
                  type="button"
                  class="text-black/40 hover:text-black text-[10px] leading-none"
                  title="Reset feed"
                  onclick={() => resetSingleParam('feed')}
                >↩</button>
              {/if}
            </span>
          </label>
          <input
            id="feed-slider"
            type="range"
            class="range range-xs"
            min="0.001"
            max="0.1"
            step="0.0001"
            value={store.params.feed}
            oninput={(e) => setParam("feed", e)}
          />
        </div>

        <div class="flex flex-col gap-0.5">
          <label
            class="text-xs text-black/60 flex justify-between items-center"
            for="kill-slider"
          >
            <span>Kill</span>
            <span class="flex items-center gap-1">
              <span class="font-mono text-black">{store.params.kill.toFixed(4)}</span>
              {#if isParamDirty('kill')}
                <button
                  type="button"
                  class="text-black/40 hover:text-black text-[10px] leading-none"
                  title="Reset kill"
                  onclick={() => resetSingleParam('kill')}
                >↩</button>
              {/if}
            </span>
          </label>
          <input
            id="kill-slider"
            type="range"
            class="range range-xs"
            min="0.001"
            max="0.1"
            step="0.0001"
            value={store.params.kill}
            oninput={(e) => setParam("kill", e)}
          />
        </div>

        <div class="flex flex-col gap-0.5">
          <label
            class="text-xs text-black/60 flex justify-between items-center"
            for="da-slider"
          >
            <span>D<sub>a</sub></span>
            <span class="flex items-center gap-1">
              <span class="font-mono text-black">{store.params.da.toFixed(2)}</span>
              {#if isParamDirty('da')}
                <button
                  type="button"
                  class="text-black/40 hover:text-black text-[10px] leading-none"
                  title="Reset Da"
                  onclick={() => resetSingleParam('da')}
                >↩</button>
              {/if}
            </span>
          </label>
          <input
            id="da-slider"
            type="range"
            class="range range-xs"
            min="0.1"
            max="2.0"
            step="0.01"
            value={store.params.da}
            oninput={(e) => setParam("da", e)}
          />
        </div>

        <div class="flex flex-col gap-0.5">
          <label
            class="text-xs text-black/60 flex justify-between items-center"
            for="db-slider"
          >
            <span>D<sub>b</sub></span>
            <span class="flex items-center gap-1">
              <span class="font-mono text-black">{store.params.db.toFixed(2)}</span>
              {#if isParamDirty('db')}
                <button
                  type="button"
                  class="text-black/40 hover:text-black text-[10px] leading-none"
                  title="Reset Db"
                  onclick={() => resetSingleParam('db')}
                >↩</button>
              {/if}
            </span>
          </label>
          <input
            id="db-slider"
            type="range"
            class="range range-xs"
            min="0.1"
            max="2.0"
            step="0.01"
            value={store.params.db}
            oninput={(e) => setParam("db", e)}
          />
        </div>

        <div class="flex flex-col gap-0.5">
          <label
            class="text-xs text-black/60 flex justify-between items-center"
            for="dt-slider"
          >
            <span>dt</span>
            <span class="flex items-center gap-1">
              <span class="font-mono text-black">{store.params.dt.toFixed(2)}</span>
              {#if isParamDirty('dt')}
                <button
                  type="button"
                  class="text-black/40 hover:text-black text-[10px] leading-none"
                  title="Reset dt"
                  onclick={() => resetSingleParam('dt')}
                >↩</button>
              {/if}
            </span>
          </label>
          <input
            id="dt-slider"
            type="range"
            class="range range-xs"
            min="0.1"
            max="2.0"
            step="0.01"
            value={store.params.dt}
            oninput={(e) => setParam("dt", e)}
          />
        </div>
      </div>
    {/if}
  </div>

  <div class="border border-black">
    <button
      type="button"
      class="w-full text-left px-2 py-1 text-xs font-bold uppercase tracking-wide bg-neutral-50 border-b border-black"
      onclick={() => toggleSection("timing")}
    >
      Timing {sectionOpen.timing ? "−" : "+"}
    </button>
    {#if sectionOpen.timing}
      <div class="p-2 flex flex-col gap-2">
        <div class="flex flex-col gap-0.5">
          <label
            class="text-xs text-black/60 flex justify-between"
            for="steps-slider"
          >
            Steps/Frame <span class="font-mono text-black"
              >{store.params.stepsPerFrame}</span
            >
          </label>
          <input
            id="steps-slider"
            type="range"
            class="range range-xs"
            min="1"
            max="16"
            step="1"
            value={store.params.stepsPerFrame}
            oninput={(e) => setParam("stepsPerFrame", e)}
          />
        </div>
      </div>
    {/if}
  </div>

  <!-- Pick from Map -->
  <button
    class="border border-black bg-white text-black px-3 py-1.5 text-xs font-bold uppercase tracking-wide hover:bg-black hover:text-white w-full"
    onclick={() => (pearsonOpen = true)}
  >
    Pick from Map
  </button>

  <PearsonMap bind:open={pearsonOpen} />
</div>
