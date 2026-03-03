<script lang="ts">
    import { store } from "$lib/store/simStore.svelte";
    import { replay } from "$lib/store/replayStore.svelte";
    import { simController } from "$lib/store/simController";
    import { onDestroy } from "svelte";

    function handleReplayWindowChange(event: Event) {
        simController.handleReplayWindowChange(
            Number((event.target as HTMLSelectElement).value),
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

        const markers: number[] = [];
        const maxIndex = replay.frames.length - 1;

        for (const iter of store.pauseIterations) {
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
                markers.push((closestIndex / maxIndex) * 100);
            }
        }

        return markers;
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

<div class="flex flex-col border-t border-black bg-white p-2 shrink-0">
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
            {#each pauseMarkers as pct}
                <div
                    class="absolute inset-y-0 w-px bg-black/80 pointer-events-none"
                    style={`left: ${pct}%;`}
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

        <span
            class="text-[10px] font-mono text-right inline-flex items-center gap-0.5"
            title="Frames captured / buffer size"
        >
            {replay.frames.length}/<select
                class="bg-transparent text-[10px] font-mono border-none p-0 cursor-pointer hover:underline appearance-none"
                style="width: auto;"
                value={String(replay.maxFramesBack)}
                onchange={handleReplayWindowChange}
                title="Change buffer size"
            >
                <option value="60">60</option>
                <option value="120">120</option>
                <option value="180">180</option>
                <option value="300">300</option>
                <option value="480">480</option>
            </select>
        </span>
    </div>

    <!-- Playback buttons row (centered) -->
    <div class="flex items-center justify-center">
        <div class="flex items-center border border-black">
            <button
                class="w-9 h-9 inline-flex items-center justify-center shrink-0 p-0 leading-none border-r border-black hover:bg-black hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                onclick={() => simController.handleReplayJump(-10)}
                disabled={replay.frames.length === 0}
                title="Jump back 10 frames"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3.5 w-3.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    ><path d="M4 12l8-7v14z" /><path d="M12 12l8-7v14z" /></svg
                >
            </button>
            <button
                class="w-9 h-9 inline-flex items-center justify-center shrink-0 p-0 leading-none border-r border-black hover:bg-black hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                onclick={() => simController.handleReplayStep(-1)}
                disabled={replay.frames.length === 0}
                title="Step back in recent history"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3.5 w-3.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    ><path d="M6 12l8-7v14z" /><path d="M16 12l6-7v14z" /></svg
                >
            </button>
            <button
                class="w-10 h-9 inline-flex items-center justify-center shrink-0 p-0 leading-none border-r border-black {store.isRunning
                    ? 'hover:bg-black hover:text-white'
                    : 'bg-black text-white hover:bg-white hover:text-black'}"
                onclick={() => simController.handlePause()}
                title={store.isRunning
                    ? "Pause (Space)"
                    : "Play from selected history frame (Space)"}
            >
                {#if store.isRunning}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        ><rect x="6" y="4" width="4" height="16" rx="0" /><rect
                            x="14"
                            y="4"
                            width="4"
                            height="16"
                            rx="0"
                        /></svg
                    >
                {:else}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg
                    >
                {/if}
            </button>
            <button
                class="w-9 h-9 inline-flex items-center justify-center shrink-0 p-0 leading-none border-r border-black hover:bg-black hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                onclick={() => simController.handleReplayStep(1)}
                disabled={replay.frames.length === 0}
                title="Step forward in recent history"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3.5 w-3.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    ><path d="M18 12l-8 7V5z" /><path d="M8 12L2 19V5z" /></svg
                >
            </button>
            <button
                class="w-9 h-9 inline-flex items-center justify-center shrink-0 p-0 leading-none hover:bg-black hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                onclick={() => simController.handleReplayJump(10)}
                disabled={replay.frames.length === 0}
                title="Jump forward 10 frames"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3.5 w-3.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    ><path d="M20 12l-8 7V5z" /><path d="M12 12L4 19V5z" /></svg
                >
            </button>
        </div>
    </div>
</div>
