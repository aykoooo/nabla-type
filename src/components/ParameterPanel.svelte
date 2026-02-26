<script lang="ts">
  import { store } from "$lib/store/simStore.svelte";
  import { PRESETS, PRESET_NAMES } from "$lib/simulation/presets";
  import PearsonMap from "./PearsonMap.svelte";

  let pearsonOpen = $state(false);

  function applyPreset(e: Event) {
    const select = e.target as HTMLSelectElement;
    const name = select.value;
    const preset = PRESETS[name];
    if (!preset) return;
    store.activePreset = name;
    store.params.feed = preset.feed;
    store.params.kill = preset.kill;
    store.params.da = preset.da;
    store.params.db = preset.db;
    store.params.dt = preset.dt;
    store.params.stepsPerFrame = preset.stepsPerFrame;
  }

  // Ensure slider values stay numeric (input type="range" can return strings)
  function setFeed(e: Event) {
    store.params.feed = Number((e.target as HTMLInputElement).value);
  }
  function setKill(e: Event) {
    store.params.kill = Number((e.target as HTMLInputElement).value);
  }
  function setDa(e: Event) {
    store.params.da = Number((e.target as HTMLInputElement).value);
  }
  function setDb(e: Event) {
    store.params.db = Number((e.target as HTMLInputElement).value);
  }
  function setDt(e: Event) {
    store.params.dt = Number((e.target as HTMLInputElement).value);
  }
  function setSteps(e: Event) {
    store.params.stepsPerFrame = Number((e.target as HTMLInputElement).value);
  }
</script>

<div class="flex flex-col gap-3 h-full">
  <h3 class="text-xs font-bold uppercase tracking-wider text-black">
    Diffusion Parameters
  </h3>

  <!-- Presets -->
  <div class="flex flex-col gap-1">
    <span class="text-xs font-bold uppercase tracking-wide text-black/50"
      >Presets</span
    >
    <select
      class="border border-black px-2 py-1 text-xs bg-white w-full"
      value={store.activePreset}
      onchange={applyPreset}
    >
      {#each PRESET_NAMES as name}
        <option value={name}>{name}</option>
      {/each}
    </select>
  </div>

  <!-- Params -->
  <div class="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
    <div class="flex flex-col gap-0.5">
      <label
        class="text-xs text-black/60 flex justify-between"
        for="feed-slider"
      >
        Feed <span class="font-mono text-black"
          >{store.params.feed.toFixed(4)}</span
        >
      </label>
      <input
        id="feed-slider"
        type="range"
        class="range range-xs"
        min="0.001"
        max="0.1"
        step="0.0001"
        value={store.params.feed}
        oninput={setFeed}
      />
    </div>

    <div class="flex flex-col gap-0.5">
      <label
        class="text-xs text-black/60 flex justify-between"
        for="kill-slider"
      >
        Kill <span class="font-mono text-black"
          >{store.params.kill.toFixed(4)}</span
        >
      </label>
      <input
        id="kill-slider"
        type="range"
        class="range range-xs"
        min="0.001"
        max="0.1"
        step="0.0001"
        value={store.params.kill}
        oninput={setKill}
      />
    </div>

    <div class="flex flex-col gap-0.5">
      <label class="text-xs text-black/60 flex justify-between" for="da-slider">
        D<sub>a</sub>
        <span class="font-mono text-black">{store.params.da.toFixed(2)}</span>
      </label>
      <input
        id="da-slider"
        type="range"
        class="range range-xs"
        min="0.1"
        max="2.0"
        step="0.01"
        value={store.params.da}
        oninput={setDa}
      />
    </div>

    <div class="flex flex-col gap-0.5">
      <label class="text-xs text-black/60 flex justify-between" for="db-slider">
        D<sub>b</sub>
        <span class="font-mono text-black">{store.params.db.toFixed(2)}</span>
      </label>
      <input
        id="db-slider"
        type="range"
        class="range range-xs"
        min="0.1"
        max="2.0"
        step="0.01"
        value={store.params.db}
        oninput={setDb}
      />
    </div>

    <div class="flex flex-col gap-0.5">
      <label class="text-xs text-black/60 flex justify-between" for="dt-slider">
        dt <span class="font-mono text-black">{store.params.dt.toFixed(2)}</span
        >
      </label>
      <input
        id="dt-slider"
        type="range"
        class="range range-xs"
        min="0.1"
        max="2.0"
        step="0.01"
        value={store.params.dt}
        oninput={setDt}
      />
    </div>

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
        max="32"
        step="1"
        value={store.params.stepsPerFrame}
        oninput={setSteps}
      />
    </div>
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
