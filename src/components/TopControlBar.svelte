<script lang="ts">
    import { store } from "$lib/store/simStore.svelte";
    import { simController, type AspectMode } from "$lib/store/simController";
    import Select from "./ui/Select.svelte";
    import Tooltip from "./ui/Tooltip.svelte";
    import MathInput from "./ui/MathInput.svelte";
    import Lock from "lucide-svelte/icons/lock";
    import Unlock from "lucide-svelte/icons/unlock";

    const aspectItems: { value: AspectMode; label: string }[] = [
        { value: "free", label: "Free" },
        { value: "1:1", label: "1:1" },
        { value: "4:3", label: "4:3" },
        { value: "16:9", label: "16:9" },
    ];

    let widthInput = $state(512);
    let heightInput = $state(512);

    $effect(() => {
        widthInput = store.resolution.width;
        heightInput = store.resolution.height;
    });

    function applyWidth() {
        simController.handleManualResolution(
            Number(widthInput),
            Number(heightInput),
            "width",
        );
    }

    function applyHeight() {
        simController.handleManualResolution(
            Number(widthInput),
            Number(heightInput),
            "height",
        );
    }

    let targetFpsInput = $state(store.targetFps);

    $effect(() => {
        targetFpsInput = store.targetFps;
    });

    function applyTargetFps() {
        simController.handleTargetFps(targetFpsInput);
    }
</script>

<div
    class="flex items-center gap-2 px-3 py-1.5 bg-white w-full overflow-x-auto shrink-0"
>
    <div class="flex items-center gap-1">
        <span class="text-[11px] font-bold uppercase mr-1">Res</span>
        <Tooltip content="Width (W)">
            <div class="relative">
                <MathInput
                    class="w-16 border border-black px-1 py-0.5 text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black pr-4"
                    bind:value={widthInput}
                    min={32}
                    max={8192}
                    decimals={0}
                    onblur={applyWidth}
                />
                <span
                    class="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-black/30 font-mono pointer-events-none"
                    >W</span
                >
            </div>
        </Tooltip>
        <Tooltip
            content={store.resolutionLocked
                ? "Locked — click to unlock"
                : "Click to lock current ratio"}
            side="bottom"
        >
            <button
                type="button"
                class="w-6 h-6 flex items-center justify-center shrink-0 {store.resolutionLocked
                    ? 'text-black'
                    : 'text-black/30 hover:text-black'}"
                onclick={() =>
                    store.resolutionLocked
                        ? simController.handleAspectMode("free")
                        : simController.handleLockCurrentRatio()}
                aria-label={store.resolutionLocked
                    ? "Unlock aspect ratio"
                    : "Lock current aspect ratio"}
            >
                {#if store.resolutionLocked}
                    <Lock class="w-3 h-3" strokeWidth={2.5} />
                {:else}
                    <Unlock class="w-3 h-3" strokeWidth={2.5} />
                {/if}
            </button>
        </Tooltip>
        <Tooltip content="Height (H)">
            <div class="relative">
                <MathInput
                    class="w-16 border border-black px-1 py-0.5 text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black pr-4"
                    bind:value={heightInput}
                    min={32}
                    max={8192}
                    decimals={0}
                    onblur={applyHeight}
                />
                <span
                    class="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-black/30 font-mono pointer-events-none"
                    >H</span
                >
            </div>
        </Tooltip>
    </div>

    <div class="w-px h-4 bg-black/20 mx-1"></div>

    <div class="flex items-center gap-1">
        <span class="text-[11px] font-bold uppercase mr-1">Aspect</span>
        <Tooltip content="Aspect ratio preset" side="bottom">
            <div class="w-16">
                <Select
                    class="h-6 text-[11px] px-1 py-0 bg-white"
                    items={aspectItems}
                    value={store.aspectMode}
                    onValueChange={(v) =>
                        simController.handleAspectMode(v as AspectMode)}
                />
            </div>
        </Tooltip>
    </div>

    <div class="w-px h-4 bg-black/20 mx-1"></div>

    <div class="flex items-center gap-1">
        <span class="text-[11px] font-bold uppercase mr-1">FPS</span>
        <Tooltip content="Target FPS (0 = unlimited)">
            <MathInput
                class="w-14 border border-black px-1 py-0.5 text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black"
                bind:value={targetFpsInput}
                min={0}
                max={240}
                decimals={0}
                onblur={applyTargetFps}
            />
        </Tooltip>
    </div>
</div>
