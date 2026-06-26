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

    let widthInput = $state(store.resolution.width);
    let heightInput = $state(store.resolution.height);

    $effect(() => {
        const live = store.resizingResolution ?? store.resolution;
        widthInput = live.width;
        heightInput = live.height;
    });

    function applyResolution(basis: "width" | "height") {
        simController.handleManualResolution(
            Number(widthInput),
            Number(heightInput),
            basis,
        );
    }

    let targetIterationInput = $state(store.targetIteration);

    $effect(() => {
        targetIterationInput = store.targetIteration;
    });

    function applyTargetIteration() {
        simController.handleTargetIteration(targetIterationInput);
    }

    const boxClass =
        "h-7 border border-black bg-white px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black";
    const labelClass =
        "text-[10px] font-bold uppercase tracking-wider text-black/60 select-none";

    const lockLabel = $derived(
        store.resolutionLocked ? "Unlock aspect ratio" : "Lock current aspect ratio",
    );
    const lockButtonClass = $derived(
        store.resolutionLocked
            ? "bg-black text-white"
            : "bg-white text-black hover:bg-black hover:text-white",
    );
</script>

<div
    class="flex items-center gap-4 px-3 py-1.5 bg-white w-full overflow-x-auto shrink-0"
>
    <!-- Resolution -->
    <div class="flex items-center gap-1.5">
        <span class={labelClass}>Res</span>
        <Tooltip content="Width (W)" side="bottom">
            <div class="relative">
                <MathInput
                    class="{boxClass} w-16 pr-5"
                    bind:value={widthInput}
                    min={32}
                    max={8192}
                    decimals={0}
                    onblur={() => applyResolution("width")}
                />
                <span
                    class="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-black/30 font-mono pointer-events-none"
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
                class="h-7 w-7 flex items-center justify-center border border-black shrink-0 transition-colors {lockButtonClass}"
                onclick={() =>
                    store.resolutionLocked
                        ? simController.handleAspectMode("free")
                        : simController.handleLockCurrentRatio()}
                aria-label={lockLabel}
                aria-pressed={store.resolutionLocked}
            >
                {#if store.resolutionLocked}
                    <Lock class="w-3 h-3" strokeWidth={2.5} />
                {:else}
                    <Unlock class="w-3 h-3" strokeWidth={2.5} />
                {/if}
            </button>
        </Tooltip>

        <Tooltip content="Height (H)" side="bottom">
            <div class="relative">
                <MathInput
                    class="{boxClass} w-16 pr-5"
                    bind:value={heightInput}
                    min={32}
                    max={8192}
                    decimals={0}
                    onblur={() => applyResolution("height")}
                />
                <span
                    class="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-black/30 font-mono pointer-events-none"
                    >H</span
                >
            </div>
        </Tooltip>
    </div>

    <div class="w-px h-7 bg-black/20 self-center"></div>

    <!-- Aspect -->
    <div class="flex items-center gap-1.5">
        <span class={labelClass}>Ratio</span>
        <Tooltip content="Aspect ratio preset" side="bottom">
            <div class="w-20">
                <Select
                    class={boxClass}
                    items={aspectItems}
                    value={store.aspectMode}
                    matchTriggerWidth
                    onValueChange={(v) =>
                        simController.handleAspectMode(v as AspectMode)}
                />
            </div>
        </Tooltip>
    </div>

    <div class="w-px h-7 bg-black/20 self-center"></div>

    <!-- Target iteration -->
    <div class="flex items-center gap-1.5">
        <span class={labelClass}>Stop</span>
        <Tooltip content="Pause automatically at this iteration (0 = unlimited)" side="bottom">
            <div class="relative">
                <MathInput
                    class="{boxClass} w-20 pr-6"
                    bind:value={targetIterationInput}
                    min={0}
                    max={999999}
                    decimals={0}
                    onblur={applyTargetIteration}
                />
                <span
                    class="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-black/30 font-mono pointer-events-none"
                    >IT</span
                >
            </div>
        </Tooltip>
    </div>
</div>
