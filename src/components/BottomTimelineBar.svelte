<script lang="ts">
    import { store } from "$lib/store/simStore.svelte";
    import { replay } from "$lib/store/replayStore.svelte";
    import { simController } from "$lib/store/simController";
    import { onDestroy } from "svelte";
    import { DropdownMenu } from "bits-ui";
    import Tooltip from "./ui/Tooltip.svelte";
    import ChevronsLeft from "lucide-svelte/icons/chevrons-left";
    import ChevronLeft from "lucide-svelte/icons/chevron-left";
    import ChevronDown from "lucide-svelte/icons/chevron-down";
    import Play from "lucide-svelte/icons/play";
    import Pause from "lucide-svelte/icons/pause";
    import ChevronRight from "lucide-svelte/icons/chevron-right";
    import ChevronsRight from "lucide-svelte/icons/chevrons-right";

    const bufferItems = [
        { value: "60", label: "60" },
        { value: "120", label: "120" },
        { value: "180", label: "180" },
        { value: "300", label: "300" },
        { value: "480", label: "480" }
    ];

    function handleReplayWindowChange(value: string) {
        simController.handleReplayWindowChange(
            Number(value),
        );
    }

    // --- Derived values ---
    const bufferFillPct = $derived(
        replay.maxFramesBack > 0
            ? (replay.frames.length / replay.maxFramesBack) * 100
            : 0,
    );

    const cursorPct = $derived(
        replay.frames.length > 1
            ? (replay.cursor / (replay.frames.length - 1)) * 100
            : 0,
    );

    let pauseMarkers = $derived.by(() => {
        if (
            !store.pauseIterations ||
            store.pauseIterations.length === 0 ||
            !replay.frames ||
            replay.frames.length < 2
        )
            return [];

        const markers: {
            pct: number;
            label: number;
            iteration: number;
            frameIndex: number;
            showLabel: boolean;
        }[] = [];
        const maxIndex = replay.frames.length - 1;

        for (let markerIndex = 0; markerIndex < store.pauseIterations.length; markerIndex++) {
            const iter = store.pauseIterations[markerIndex];
            let closestIndex = -1;
            let minDiff = Infinity;

            for (let i = 0; i < replay.frames.length; i++) {
                const diff = Math.abs(replay.frames[i].iteration - iter);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestIndex = i;
                }
            }

            if (closestIndex >= 0 && minDiff < 100) {
                markers.push({
                    pct: (closestIndex / maxIndex) * 100,
                    label: markerIndex + 1,
                    iteration: iter,
                    frameIndex: closestIndex,
                    showLabel: true,
                });
            }
        }

        const LABEL_MIN_GAP_PCT = 3.6;
        let lastShownPct = -Infinity;
        for (const marker of markers) {
            if (marker.pct - lastShownPct < LABEL_MIN_GAP_PCT) {
                marker.showLabel = false;
            } else {
                marker.showLabel = true;
                lastShownPct = marker.pct;
            }
        }

        return markers;
    });

    const activePauseLabel = $derived.by(() => {
        if (pauseMarkers.length === 0 || replay.frames.length < 2) return null;
        const cursor = Math.max(0, Math.min(replay.frames.length - 1, replay.cursor));
        let best: typeof pauseMarkers[number] | null = null;
        let bestDist = Infinity;
        for (const marker of pauseMarkers) {
            const dist = Math.abs(marker.frameIndex - cursor);
            if (dist < bestDist) {
                bestDist = dist;
                best = marker;
            }
        }
        return best;
    });

    // --- Custom track drag logic ---
    let trackEl: HTMLDivElement;
    let isDragging = $state(false);

    function seekFromPointer(e: MouseEvent) {
        if (!trackEl || replay.frames.length === 0) return;
        const rect = trackEl.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const pct = x / rect.width;
        const index = Math.round(pct * (replay.frames.length - 1));
        simController.handleReplaySeek(index);
    }

    function handleTrackMouseDown(e: MouseEvent) {
        e.preventDefault();
        isDragging = true;
        seekFromPointer(e);
        window.addEventListener("mousemove", handleWindowMouseMove);
        window.addEventListener("mouseup", handleWindowMouseUp);
    }

    function handleWindowMouseMove(e: MouseEvent) {
        if (!isDragging) return;
        seekFromPointer(e);
    }

    function handleWindowMouseUp() {
        isDragging = false;
        window.removeEventListener("mousemove", handleWindowMouseMove);
        window.removeEventListener("mouseup", handleWindowMouseUp);
    }

    onDestroy(() => {
        window.removeEventListener("mousemove", handleWindowMouseMove);
        window.removeEventListener("mouseup", handleWindowMouseUp);
    });
</script>

<div class="flex flex-col bg-white p-2 shrink-0">
    <!-- Custom timeline track row -->
    <div class="flex items-center gap-2 mb-2 px-1">
        <span
            class="text-[10px] font-bold uppercase tracking-widest text-black/60"
            >History</span
        >

        <!-- Custom track -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            bind:this={trackEl}
            class="flex-1 relative h-5 border border-black bg-neutral-100 cursor-pointer select-none"
            onmousedown={handleTrackMouseDown}
        >
            <!-- Buffer fill -->
            <div
                class="absolute inset-y-0 left-0 bg-neutral-300/60"
                style={`width: ${bufferFillPct}%;`}
            ></div>

            <!-- Pause markers -->
            {#each pauseMarkers as marker}
                <div
                    class="absolute top-[2px] bottom-[2px] w-px pointer-events-none {activePauseLabel && activePauseLabel.label === marker.label
                        ? 'bg-black'
                        : 'bg-black/45'}"
                    style={`left: ${marker.pct}%;`}
                ></div>

                <div
                    class="absolute -translate-x-1/2 w-[3px] h-[3px] rounded-full pointer-events-none {activePauseLabel && activePauseLabel.label === marker.label
                        ? 'bg-black'
                        : 'bg-black/65'}"
                    style={`left: ${marker.pct}%; top: 1px;`}
                ></div>

                {#if marker.showLabel}
                    <div
                        class="absolute bottom-[1px] -translate-x-1/2 text-[9px] font-mono leading-none px-0.5 rounded-sm pointer-events-none {activePauseLabel && activePauseLabel.label === marker.label
                            ? 'bg-black text-white'
                            : 'bg-white/85 text-black/65'}"
                        style={`left: ${marker.pct}%;`}
                    >
                        {marker.label}
                    </div>
                {/if}

                <div
                    class="absolute inset-y-0 w-3 -translate-x-1/2 cursor-help"
                    style={`left: ${marker.pct}%;`}
                    title={`Pause #${marker.label}\nIteration: ${marker.iteration}\nFrame: ${marker.frameIndex + 1}`}
                ></div>
            {/each}

            <!-- Cursor handle -->
            {#if replay.frames.length > 0}
                <div
                    class="absolute inset-y-0 w-[3px] -translate-x-1/2 bg-black pointer-events-none"
                    style={`left: ${cursorPct}%;`}
                >
                    <!-- Small top triangle -->
                    <div
                        class="absolute -top-[3px] left-1/2 -translate-x-1/2 w-0 h-0"
                        style="border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 4px solid black;"
                    ></div>
                </div>
            {/if}
        </div>

        <Tooltip content="Frames captured / buffer size" side="top">
            <span class="text-[10px] text-black/50 font-mono text-right inline-flex items-center gap-2 pr-2">
                <span class="text-black/70">{replay.frames.length}/</span>
                <Tooltip content="Change buffer size" side="top">
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger class="bg-transparent text-black/70 hover:text-black font-mono border-none p-0 m-0 cursor-pointer h-auto outline-none focus-visible:ring-0 underline decoration-dashed decoration-black/40 hover:decoration-black flex items-center gap-0.5">
                            {replay.maxFramesBack} <ChevronDown class="w-3 h-3" strokeWidth={3} />
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                            <DropdownMenu.Content class="z-50 min-w-20 bg-white border border-black shadow-md p-1 outline-none" sideOffset={4}>
                                {#each bufferItems as item}
                                    <DropdownMenu.Item
                                        class="relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-xs font-mono outline-none hover:bg-neutral-100 data-[highlighted]:bg-black data-[highlighted]:text-white"
                                        onSelect={() => handleReplayWindowChange(item.value)}
                                    >
                                        {item.label}
                                    </DropdownMenu.Item>
                                {/each}
                            </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                </Tooltip>
            </span>
        </Tooltip>
    </div>

    <!-- Playback buttons row (centered) -->
    <div class="flex items-center justify-center pt-2">
        <div class="flex items-center border border-black">
            <Tooltip content="Jump back 10 frames" side="top">
                <button
                    class="w-9 h-9 inline-flex items-center justify-center shrink-0 p-0 leading-none border-r border-black hover:bg-black hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    onclick={() => simController.handleReplayJump(-10)}
                    disabled={replay.frames.length === 0}
                    aria-label="Jump back 10 frames"
                >
                    <ChevronsLeft class="h-3.5 w-3.5" />
                </button>
            </Tooltip>
            
            <Tooltip content="Step back in recent history (ArrowLeft)" side="top">
                <button
                    class="w-9 h-9 inline-flex items-center justify-center shrink-0 p-0 leading-none border-r border-black hover:bg-black hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    onclick={() => simController.handleReplayStep(-1)}
                    disabled={replay.frames.length === 0}
                    aria-label="Step back in recent history"
                >
                    <ChevronLeft class="h-3.5 w-3.5" />
                </button>
            </Tooltip>

            <Tooltip content={store.isRunning ? "Pause (Space)" : "Play from selected history frame (Space)"} side="top">
                <button
                    class="w-10 h-9 inline-flex items-center justify-center shrink-0 p-0 leading-none border-r border-black {store.isRunning ? 'hover:bg-black hover:text-white' : 'bg-black text-white hover:bg-white hover:text-black'}"
                    onclick={() => simController.handlePause()}
                    aria-label={store.isRunning ? "Pause playback" : "Play from history"}
                >
                    {#if store.isRunning}
                        <Pause class="h-4 w-4" />
                    {:else}
                        <Play class="h-4 w-4" fill="currentColor" />
                    {/if}
                </button>
            </Tooltip>

            <Tooltip content="Step forward in recent history (ArrowRight)" side="top">
                <button
                    class="w-9 h-9 inline-flex items-center justify-center shrink-0 p-0 leading-none border-r border-black hover:bg-black hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    onclick={() => simController.handleReplayStep(1)}
                    disabled={replay.frames.length === 0}
                    aria-label="Step forward in recent history"
                >
                    <ChevronRight class="h-3.5 w-3.5" />
                </button>
            </Tooltip>

            <Tooltip content="Jump forward 10 frames" side="top">
                <button
                    class="w-9 h-9 inline-flex items-center justify-center shrink-0 p-0 leading-none hover:bg-black hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    onclick={() => simController.handleReplayJump(10)}
                    disabled={replay.frames.length === 0}
                    aria-label="Jump forward 10 frames"
                >
                    <ChevronsRight class="h-3.5 w-3.5" />
                </button>
            </Tooltip>
        </div>
    </div>
</div>
