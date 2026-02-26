<script lang="ts">
    import { store } from "$lib/store/simStore.svelte";

    let {
        onmin,
        onmax,
        onsave,
        onpause,
        onloop,
        ontrash,
    }: {
        onmin?: () => void;
        onmax?: () => void;
        onsave?: () => void;
        onpause?: () => void;
        onloop?: () => void;
        ontrash?: () => void;
    } = $props();
</script>

<div class="flex flex-wrap items-center gap-3 px-3 py-1.5">
    <!-- Group 1: Sizing/State -->
    <div class="flex border border-black group-hover:border-black/50">
        <button
            class="px-2 py-1 text-xs font-bold uppercase hover:bg-black hover:text-white border-r border-black"
            onclick={onmin}
            title="Minimize canvas"
        >
            Min
        </button>
        <button
            class="px-2 py-1 text-xs font-bold uppercase hover:bg-black hover:text-white border-r border-black"
            onclick={onmax}
            title="Maximize canvas"
        >
            Max
        </button>
        <button
            class="px-2 py-1 flex items-center gap-1 text-xs font-bold uppercase hover:bg-black hover:text-white"
            onclick={onsave}
            title="Save as PNG"
        >
            Save
        </button>
    </div>

    <!-- Group 2: Playback/Control -->
    <div class="flex border border-black">
        <button
            class="px-2 py-1 flex items-center justify-center border-r border-black {store.isRunning
                ? 'hover:bg-black hover:text-white'
                : 'bg-black text-white hover:bg-white hover:text-black'}"
            onclick={onpause}
            title={store.isRunning ? "Pause (Space)" : "Resume (Space)"}
        >
            {#if store.isRunning}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                >
                    <rect x="6" y="4" width="4" height="16" rx="0" />
                    <rect x="14" y="4" width="4" height="16" rx="0" />
                </svg>
            {:else}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path d="M8 5v14l11-7z" />
                </svg>
            {/if}
        </button>
        <button
            class="px-2 py-1 flex items-center justify-center hover:bg-black hover:text-white border-r border-black"
            onclick={onloop}
            title="Reset (R)"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
            </svg>
        </button>
        <button
            class="px-2 py-1 flex items-center justify-center text-red-600 hover:bg-red-600 hover:text-white"
            onclick={ontrash}
            title="Clear simulation"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
            </svg>
        </button>
    </div>
</div>
