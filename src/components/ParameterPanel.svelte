<script lang="ts">
  import { store } from "$lib/store/simStore.svelte";
  import { DropdownMenu, ToggleGroup } from "bits-ui";
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
    paramsEqualRounded,
    renamePreset,
    reorderPresets,
    resetToDefaults,
    round4,
    updatePresetParams,
  } from "$lib/store/presetStore";
  import { simController } from "$lib/store/simController";
  import { blurActiveElement } from "$lib/utils/focus";
  import type { SimParams } from "$lib/simulation/presets";

  let savePresetName = $state("");
  let renamingId = $state<string | null>(null);
  let renameValue = $state("");
  let showNewInput = $state(false);

  const paramsDirty = $derived(
    !paramsEqualRounded(store.params, store.baselineParams),
  );

  const presetCreateEligible = $derived(
    !coreParamsEqual(store.params, store.baselineParams),
  );

  const isPOT = $derived(
    isPowerOfTwo(store.resolution.width) && isPowerOfTwo(store.resolution.height),
  );

  const menuItemClass =
    "relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-xs outline-none hover:bg-neutral-100 data-[highlighted]:bg-black data-[highlighted]:text-white";
  const menuDeleteClass =
    "relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-xs outline-none hover:bg-red-50 text-red-600 data-[highlighted]:bg-red-600 data-[highlighted]:text-white data-[disabled]:opacity-50";
  const menuSeparatorClass = "h-px bg-black my-1";

  const boundaryItems = [
    {
      value: "clamp",
      label: "Clamp",
      tooltip: "Edge values are clamped (works at any resolution)",
    },
    {
      value: "repeat",
      label: "Repeat",
      tooltip: "Texture repeats at edges (requires power-of-two resolution)",
    },
    {
      value: "mirror",
      label: "Mirror",
      tooltip: "Texture mirrors at edges (requires power-of-two resolution)",
    },
  ] as const;

  function coreParamsEqual(a: SimParams, b: SimParams): boolean {
    return (
      round4(a.feed) === round4(b.feed) &&
      round4(a.kill) === round4(b.kill) &&
      round4(a.da) === round4(b.da) &&
      round4(a.db) === round4(b.db) &&
      round4(a.dt) === round4(b.dt)
    );
  }

  function isPowerOfTwo(n: number): boolean {
    return (n & (n - 1)) === 0 && n > 0;
  }

  function isParamDirty(name: keyof SimParams): boolean {
    return round4(store.params[name]) !== round4(store.baselineParams[name]);
  }

  function resetSingleParam(name: keyof SimParams) {
    store.params[name] = store.baselineParams[name];
  }

  function resetToActivePreset() {
    simController.applyPresetById(store.activePresetId);
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
</script>

<div class="flex flex-col gap-4">
  <!-- Presets Bar -->
  <div class="flex flex-col gap-1">
    <div class="flex gap-1">
      <Select
        class="flex-1 w-full"
        items={store.presets.map((p) => ({ value: p.id, label: p.name }))}
        value={store.activePresetId}
        matchTriggerWidth
        onValueChange={(v) => v && simController.applyPresetById(v)}
      />

      <Tooltip
        content={presetCreateEligible ? "Save current params as new preset" : "Modify parameters first"}
        side="top"
      >
        <button
          type="button"
          class="border border-black px-2 py-1 text-[10px] uppercase font-bold tracking-wider hover:bg-black hover:text-white shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          onclick={() => (showNewInput = !showNewInput)}
          disabled={!presetCreateEligible}>+ New</button>
      </Tooltip>

      <Tooltip content="Update current preset" side="top">
        <button
          type="button"
          class="border border-black px-2 py-1 text-[10px] uppercase font-bold tracking-wider hover:bg-black hover:text-white shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          onclick={() => handleUpdateParams(store.activePresetId)}
          disabled={!paramsDirty}>Update</button>
      </Tooltip>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class="border border-black px-2 py-1 text-xs font-bold hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black shrink-0">⋮</DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            class="z-50 min-w-32 bg-white border border-black shadow-md p-1 outline-none"
            sideOffset={4}>
            <DropdownMenu.Item
              class={menuItemClass}
              onSelect={() => { startRename(store.activePresetId); blurActiveElement(); }}>Rename</DropdownMenu.Item>
            <DropdownMenu.Item
              class={menuItemClass}
              onSelect={() => { handleDuplicate(store.activePresetId); blurActiveElement(); }}>Duplicate</DropdownMenu.Item>
            <DropdownMenu.Separator class={menuSeparatorClass} />
            <DropdownMenu.Item
              class={menuItemClass}
              onSelect={() => { handleImport(); blurActiveElement(); }}>Import Library</DropdownMenu.Item>
            <DropdownMenu.Item
              class={menuItemClass}
              onSelect={() => { handleExport(); blurActiveElement(); }}>Export Library</DropdownMenu.Item>
            <DropdownMenu.Separator class={menuSeparatorClass} />
            <DropdownMenu.Item
              class={menuItemClass}
              onSelect={() => { handleReset(); blurActiveElement(); }}>Restore Defaults</DropdownMenu.Item>
            <DropdownMenu.Separator class={menuSeparatorClass} />
            <DropdownMenu.Item
              class={menuItemClass}
              onSelect={() => { handleMoveUp(store.activePresetId); blurActiveElement(); }}>Move Up</DropdownMenu.Item>
            <DropdownMenu.Item
              class={menuItemClass}
              onSelect={() => { handleMoveDown(store.activePresetId); blurActiveElement(); }}>Move Down</DropdownMenu.Item>
            <DropdownMenu.Separator class={menuSeparatorClass} />
            <DropdownMenu.Item
              disabled={store.presets.length <= 1}
              class={menuDeleteClass}
              onSelect={() => { handleDelete(store.activePresetId); blurActiveElement(); }}>Delete</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>

    {#if renamingId}
      <div class="p-2 border-b border-black flex gap-1">
        <!-- svelte-ignore a11y_autofocus -->
        <input
          class="border border-black px-2 py-1 text-xs w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black h-7"
          bind:value={renameValue}
          onkeydown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") renamingId = null;
          }}
          autofocus
        />
        <button
          type="button"
          class="border border-black bg-black text-white px-2 py-1 text-xs font-bold hover:opacity-80 h-7"
          onclick={commitRename}>Save</button>
      </div>
    {/if}

    {#if showNewInput}
      <div class="p-2 border-b border-black flex gap-1">
        <!-- svelte-ignore a11y_autofocus -->
        <input
          class="border border-black px-2 py-1 text-xs w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black h-7"
          placeholder="New preset name"
          bind:value={savePresetName}
          onkeydown={(e) => {
            if (e.key === "Enter") handleSaveNew();
            if (e.key === "Escape") showNewInput = false;
          }}
          autofocus
        />
        <button
          type="button"
          class="border border-black bg-black text-white px-2 py-1 text-xs font-bold hover:opacity-80 h-7 disabled:opacity-40 disabled:cursor-not-allowed"
          onclick={handleSaveNew}
          disabled={!savePresetName.trim()}>Save</button>
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
      isDirty={isParamDirty("feed")}
      onReset={() => resetSingleParam("feed")}
    />
    <ParamInput
      id="kill-slider"
      label="Kill"
      bind:value={store.params.kill}
      min={0.001} max={0.1} step={0.0001}
      isDirty={isParamDirty("kill")}
      onReset={() => resetSingleParam("kill")}
    />
    <ParamInput
      id="da-slider"
      label="D<sub>a</sub>"
      bind:value={store.params.da}
      min={0.1} max={2.0} step={0.01}
      isDirty={isParamDirty("da")}
      onReset={() => resetSingleParam("da")}
    />
    <ParamInput
      id="db-slider"
      label="D<sub>b</sub>"
      bind:value={store.params.db}
      min={0.1} max={2.0} step={0.01}
      isDirty={isParamDirty("db")}
      onReset={() => resetSingleParam("db")}
    />
    <ParamInput
      id="dt-slider"
      label="dt"
      bind:value={store.params.dt}
      min={0.1} max={2.0} step={0.01}
      isDirty={isParamDirty("dt")}
      onReset={() => resetSingleParam("dt")}
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

  <!-- Boundary -->
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <span class="text-[11px] font-bold uppercase tracking-wider">Boundary</span>
      {#if !isPOT}
        <span class="text-[9px] font-mono text-brutal-secondary">NPOT → clamp only</span>
      {/if}
    </div>
    <ToggleGroup.Root type="single" bind:value={store.boundaryMode} class="flex gap-1">
      {#each boundaryItems as item}
        {@const disabled = (item.value === "repeat" || item.value === "mirror") && !isPOT}
        <Tooltip content={item.tooltip} side="top">
          <ToggleGroup.Item
            value={item.value}
            {disabled}
            class="flex-1 h-7 text-[10px] font-bold uppercase tracking-wide border border-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed {store.boundaryMode === item.value ? 'bg-black text-white' : 'bg-white text-black hover:bg-black hover:text-white'}"
          >
            {item.label}
          </ToggleGroup.Item>
        </Tooltip>
      {/each}
    </ToggleGroup.Root>
  </div>
</div>
