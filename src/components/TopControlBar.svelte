<script lang="ts">
    import { store } from "$lib/store/simStore.svelte";
    import { simController } from "$lib/store/simController";

    let widthInput = $state(512);
    let heightInput = $state(512);

    $effect(() => {
        widthInput = store.resolution.width;
        heightInput = store.resolution.height;
    });

    function applyResolution() {
        simController.handleManualResolution(
            Number(widthInput),
            Number(heightInput),
        );
    }

    function handleAspectChange(event: Event) {
        const value = (event.target as HTMLSelectElement).value as
            | "free"
            | "1:1"
            | "4:3"
            | "16:9";
        simController.handleAspectMode(value);
    }

    function handleLockChange(event: Event) {
        simController.handleResolutionLock(
            (event.target as HTMLInputElement).checked,
        );
    }

    function handleTargetFpsChange(event: Event) {
        simController.handleTargetFps(
            Number((event.target as HTMLInputElement).value),
        );
    }
</script>

<div
    class="flex items-center gap-2 px-3 py-1.5 border-b border-black bg-white w-full overflow-x-auto shrink-0"
>
    <div class="flex items-center gap-1">
        <span class="text-[11px] font-bold uppercase mr-1">Res</span>
        <input
            type="number"
            min="32"
            max="8192"
            class="w-16 border border-black px-1 py-0.5 text-[11px]"
            bind:value={widthInput}
            onblur={applyResolution}
            onkeydown={(e) => e.key === "Enter" && applyResolution()}
            title="Width"
        />
        <span class="text-xs">×</span>
        <input
            type="number"
            min="32"
            max="8192"
            class="w-16 border border-black px-1 py-0.5 text-[11px]"
            bind:value={heightInput}
            onblur={applyResolution}
            onkeydown={(e) => e.key === "Enter" && applyResolution()}
            title="Height"
        />
        <button
            type="button"
            class="px-1.5 py-0.5 text-[10px] font-bold border border-black hover:bg-black hover:text-white"
            onclick={applyResolution}
            title="Apply resolution"
        >
            Set
        </button>
    </div>

    <div class="w-px h-4 bg-black/20 mx-1"></div>

    <div class="flex items-center gap-1">
        <span class="text-[11px] font-bold uppercase mr-1">Aspect</span>
        <select
            class="border border-black px-1 py-0.5 text-[11px]"
            value={store.aspectMode}
            onchange={handleAspectChange}
            title="Aspect ratio"
        >
            <option value="free">Free</option>
            <option value="1:1">1:1</option>
            <option value="4:3">4:3</option>
            <option value="16:9">16:9</option>
        </select>
        <label class="flex items-center gap-1 text-[11px] ml-1">
            <input
                type="checkbox"
                checked={store.resolutionLocked}
                onchange={handleLockChange}
            />
            Lock
        </label>
    </div>

    <div class="w-px h-4 bg-black/20 mx-1"></div>

    <div class="flex items-center gap-1">
        <span class="text-[11px] font-bold uppercase mr-1">FPS</span>
        <input
            type="number"
            min="0"
            max="240"
            class="w-14 border border-black px-1 py-0.5 text-[11px]"
            value={store.targetFps}
            onchange={handleTargetFpsChange}
            title="Target FPS (0 = unlimited)"
        />
    </div>
</div>
