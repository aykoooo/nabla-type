<script lang="ts">
    import { store } from "$lib/store/simStore.svelte";
    import { simController } from "$lib/store/simController";

    const canUndo = $derived(store.hasPauseSnapshot);
    const canMin = $derived(store.seedText.trim().length > 0);
</script>

<div
    class="flex flex-col border-r border-black bg-white shrink-0 w-10 items-center py-2 gap-2"
>
    <button
        class="w-7 h-7 flex flex-col items-center justify-center border border-black hover:bg-black hover:text-white group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-inherit"
        onclick={() => simController.handleMin()}
        disabled={!canMin}
        title="Crop canvas to fit simulation"
    >
        <span class="text-[9px] font-bold leading-tight uppercase">Min</span>
    </button>
    <button
        class="w-7 h-7 flex flex-col items-center justify-center border border-black hover:bg-black hover:text-white group"
        onclick={() => simController.handleMax()}
        title="Maximize canvas"
    >
        <span class="text-[9px] font-bold leading-tight uppercase">Max</span>
    </button>

    <div class="w-7 h-px bg-black/20 my-1"></div>

    <button
        class="w-7 h-7 flex flex-col items-center justify-center border border-black hover:bg-black hover:text-white group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-inherit"
        onclick={() => simController.handleUndo()}
        disabled={!canUndo}
        title="Undo to last paused snapshot"
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
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
        </svg>
    </button>

    <button
        class="w-7 h-7 flex flex-col items-center justify-center border border-black hover:bg-black hover:text-white group"
        onclick={() => simController.handleSave()}
        title="Save as PNG"
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
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
            />
        </svg>
    </button>

    <div class="w-7 h-px bg-black/20 my-1"></div>

    <button
        class="w-7 h-7 flex flex-col items-center justify-center border border-black hover:bg-black hover:text-white group"
        onclick={() => simController.handleLoop()}
        title="Reset"
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
        class="w-7 h-7 flex flex-col items-center justify-center border border-black text-red-600 hover:bg-red-600 hover:text-white group"
        onclick={() => simController.handleTrash()}
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
