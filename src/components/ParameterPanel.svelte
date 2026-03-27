<script lang="ts">
  import { store } from "$lib/store/simStore.svelte";
  import { onMount } from "svelte";
  import { DropdownMenu } from "bits-ui";
  import PearsonMap from "./PearsonMap.svelte";
  import Select from "./ui/Select.svelte";
  import Tooltip from "./ui/Tooltip.svelte";
  import ParamInput from "./ui/ParamInput.svelte";
  import {
    addPreset,
    cloneParams,
    deletePreset,
    duplicatePreset,
    exportPresets,
    findActiveIndex,
    getPresetById,
    importPresets,
    loadPresets,
    paramsEqualRounded,
    renamePreset,
    reorderPresets,
    resetToDefaults,
    round4,
    updatePresetParams,
  } from "$lib/store/presetStore";
  import { simController } from "$lib/store/simController";

  let pearsonOpen = $state(false);
  let savePresetName = $state("");
  let renamingId = $state<string | null>(null);
  let renameValue = $state("");
  let showNewInput = $state(false);

  function applyPreset(id: string) {
    simController.applyPresetById(id);
  }

  function handleSaveNew() {
    const name = savePresetName.trim();
    if (!name) return;
    store.presets = addPreset(store.presets, name, store.params);
    const added = store.presets[store.presets.length - 1];
    simController.applyPresetById(added.id);
    savePresetName = "";
    showNewInput = false;
  }

  function handleDelete(id: string) {
    const wasActive = store.activePresetId === id;
    const idx = findActiveIndex(store.presets, id);
    store.presets = deletePreset(store.presets, id);
    if (wasActive && store.presets.length > 0) {
      const nextIdx = Math.min(idx, store.presets.length - 1);
      simController.applyPresetById(store.presets[nextIdx].id);
    }
  }

  function handleDuplicate(id: string) {
    store.presets = duplicatePreset(store.presets, id);
  }

  function startRename(id: string) {
    const entry = getPresetById(store.presets, id);
    if (!entry) return;
    renamingId = id;
    renameValue = entry.name;
  }

  function commitRename() {
    if (renamingId && renameValue.trim()) {
      store.presets = renamePreset(store.presets, renamingId, renameValue);
    }
    renamingId = null;
    renameValue = "";
  }

  function handleMoveUp(id: string) {
    const idx = findActiveIndex(store.presets, id);
    if (idx > 0) {
      store.presets = reorderPresets(store.presets, idx, idx - 1);
    }
  }

  function handleMoveDown(id: string) {
    const idx = findActiveIndex(store.presets, id);
    if (idx < store.presets.length - 1) {
      store.presets = reorderPresets(store.presets, idx, idx + 1);
    }
  }

  function handleUpdateParams(id: string) {
    store.presets = updatePresetParams(store.presets, id, store.params);
    store.baselineParams = cloneParams(store.params);
  }

  function handleExport() {
    const json = exportPresets(store.presets);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nabla-presets.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = importPresets(reader.result as string);
        if (result) {
          store.presets = result;
          if (result.length > 0) {
            simController.applyPresetById(result[0].id);
          }
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function handleReset() {
    if (!confirm("Reset all presets to factory defaults?")) return;
    store.presets = resetToDefaults();
    if (store.presets.length > 0) {
      simController.applyPresetById(store.presets[0].id);
    }
  }

  function resetToBaseline() {
    simController.applyPresetById(store.activePresetId);
  }

  function resetSingleParam(name: keyof typeof store.params) {
    store.params[name] = store.baselineParams[name];
  }

  function isParamDirty(name: keyof typeof store.params): boolean {
    return round4(store.params[name]) !== round4(store.baselineParams[name]);
  }

  const DIRTY_BADGE_PLACEHOLDER = "modified";

  const paramsDirty = $derived(
    !paramsEqualRounded(store.params, store.baselineParams),
  );

  const presetCreateEligible = $derived(
    round4(store.params.feed) !== round4(store.baselineParams.feed) ||
      round4(store.params.kill) !== round4(store.baselineParams.kill) ||
      round4(store.params.da) !== round4(store.baselineParams.da) ||
      round4(store.params.db) !== round4(store.baselineParams.db) ||
      round4(store.params.dt) !== round4(store.baselineParams.dt),
  );

  onMount(() => {
    store.presets = loadPresets();
    simController.applyPresetById(store.activePresetId);
  });
</script>

<svelte:window
  onkeydown={(e) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    )
      return;

    if (e.key === "m") {
      e.preventDefault();
      pearsonOpen = !pearsonOpen;
    }
  }}
/>

<div class="flex flex-col gap-4">
  <!-- Presets Bar -->
  <div class="flex flex-col gap-1">
    <div class="flex gap-1">
      <Select
        class="flex-1 w-full"
        items={store.presets.map(p => ({ value: p.id, label: p.name }))}
        value={store.activePresetId}
        onValueChange={(v) => { if (v) simController.applyPresetById(v); }}
      />
      
      <Tooltip content={presetCreateEligible ? "Save current params as new preset" : "Modify parameters first"} side="top">
        <button type="button" class="border border-black px-2 py-1 text-[10px] uppercase font-bold tracking-wider hover:bg-black hover:text-white shrink-0 disabled:opacity-40" onclick={() => (showNewInput = !showNewInput)} disabled={!presetCreateEligible}>+ New</button>
      </Tooltip>
      <Tooltip content="Update current preset" side="top">
        <button type="button" class="border border-black px-2 py-1 text-[10px] uppercase font-bold tracking-wider hover:bg-black hover:text-white shrink-0 disabled:opacity-40" onclick={() => handleUpdateParams(store.activePresetId)} disabled={!paramsDirty}>Update</button>
      </Tooltip>
      
      <DropdownMenu.Root>
        <DropdownMenu.Trigger class="border border-black px-2 py-1 text-xs font-bold hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black shrink-0">⋮</DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content class="z-50 min-w-32 bg-white border border-black shadow-md p-1 outline-none" sideOffset={4}>
            <DropdownMenu.Item class="relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-xs outline-none hover:bg-neutral-100 data-[highlighted]:bg-black data-[highlighted]:text-white" onSelect={() => startRename(store.activePresetId)}>Rename</DropdownMenu.Item>
            <DropdownMenu.Item class="relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-xs outline-none hover:bg-neutral-100 data-[highlighted]:bg-black data-[highlighted]:text-white" onSelect={() => handleDuplicate(store.activePresetId)}>Duplicate</DropdownMenu.Item>
            <DropdownMenu.Separator class="h-px bg-black/10 my-1" />
            <DropdownMenu.Item class="relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-xs outline-none hover:bg-neutral-100 data-[highlighted]:bg-black data-[highlighted]:text-white" onSelect={handleImport}>Import Library</DropdownMenu.Item>
            <DropdownMenu.Item class="relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-xs outline-none hover:bg-neutral-100 data-[highlighted]:bg-black data-[highlighted]:text-white" onSelect={handleExport}>Export Library</DropdownMenu.Item>
            <DropdownMenu.Separator class="h-px bg-black/10 my-1" />
            <DropdownMenu.Item class="relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-xs outline-none hover:bg-neutral-100 data-[highlighted]:bg-black data-[highlighted]:text-white" onSelect={handleReset}>Restore Defaults</DropdownMenu.Item>
            <DropdownMenu.Separator class="h-px bg-black/10 my-1" />
            <DropdownMenu.Item class="relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-xs outline-none hover:bg-neutral-100 data-[highlighted]:bg-black data-[highlighted]:text-white" onSelect={() => handleMoveUp(store.activePresetId)}>Move Up</DropdownMenu.Item>
            <DropdownMenu.Item class="relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-xs outline-none hover:bg-neutral-100 data-[highlighted]:bg-black data-[highlighted]:text-white" onSelect={() => handleMoveDown(store.activePresetId)}>Move Down</DropdownMenu.Item>
            <DropdownMenu.Separator class="h-px bg-black/10 my-1" />
            <DropdownMenu.Item disabled={store.presets.length <= 1} class="relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-xs outline-none hover:bg-red-50 text-red-600 data-[highlighted]:bg-red-600 data-[highlighted]:text-white data-[disabled]:opacity-50" onSelect={() => handleDelete(store.activePresetId)}>Delete</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>

        {#if renamingId}
          <div class="p-2 border-b border-black/10 flex gap-1">
            <!-- svelte-ignore a11y_autofocus -->
            <input
              class="border border-black px-2 py-1 text-xs w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black h-7"
              bind:value={renameValue}
              onkeydown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { renamingId = null; }
              }}
              autofocus
            />
            <button
              type="button"
              class="border border-black bg-black text-white px-2 py-1 text-xs font-bold hover:opacity-80 h-7"
              onclick={commitRename}
            >Save</button>
          </div>
        {/if}

        {#if showNewInput}
          <div class="p-2 border-b border-black/10 flex gap-1">
            <!-- svelte-ignore a11y_autofocus -->
            <input
              class="border border-black px-2 py-1 text-xs w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black h-7"
              placeholder="New preset name"
              bind:value={savePresetName}
              onkeydown={(e) => { if (e.key === "Enter") handleSaveNew(); if (e.key === "Escape") showNewInput = false; }}
              autofocus
            />
            <button
              type="button"
              class="border border-black bg-black text-white px-2 py-1 text-xs font-bold hover:opacity-80 h-7 disabled:opacity-40"
              onclick={handleSaveNew}
              disabled={!savePresetName.trim()}
            >Save</button>
          </div>
        {/if}

  </div>

  <!-- Params -->
  <div class="flex flex-col gap-2 relative">
    <ParamInput
      id="feed-slider"
      label="Feed"
      bind:value={store.params.feed}
      min={0.001} max={0.1} step={0.0001}
      isDirty={isParamDirty('feed')}
      onReset={() => resetSingleParam('feed')}
    />
    <ParamInput
      id="kill-slider"
      label="Kill"
      bind:value={store.params.kill}
      min={0.001} max={0.1} step={0.0001}
      isDirty={isParamDirty('kill')}
      onReset={() => resetSingleParam('kill')}
    />
    <ParamInput
      id="da-slider"
      label="D<sub>a</sub>"
      bind:value={store.params.da}
      min={0.1} max={2.0} step={0.01}
      isDirty={isParamDirty('da')}
      onReset={() => resetSingleParam('da')}
    />
    <ParamInput
      id="db-slider"
      label="D<sub>b</sub>"
      bind:value={store.params.db}
      min={0.1} max={2.0} step={0.01}
      isDirty={isParamDirty('db')}
      onReset={() => resetSingleParam('db')}
    />
    <ParamInput
      id="dt-slider"
      label="dt"
      bind:value={store.params.dt}
      min={0.1} max={2.0} step={0.01}
      isDirty={isParamDirty('dt')}
      onReset={() => resetSingleParam('dt')}
    />
  </div>

  <div class="h-px bg-black opacity-10 my-1"></div>

  <!-- Timing -->
  <div class="flex flex-col gap-2">
    <ParamInput
      id="steps-slider"
      label="Steps per frame"
      bind:value={store.params.stepsPerFrame}
      min={1} max={16} step={1}
    />
  </div>

  <div class="h-px bg-black opacity-10 my-1"></div>

  <!-- Pick from Map -->
  <button
    class="border border-black bg-white text-black px-3 py-1.5 text-xs font-semibold tracking-wide hover:bg-black hover:text-white w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
    onclick={() => (pearsonOpen = true)}
  >
    Pick from Parameter Map
  </button>

  <PearsonMap bind:open={pearsonOpen} />
</div>
