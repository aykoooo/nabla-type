<script lang="ts">
    import { store } from "$lib/store/simStore.svelte";
    import { simController } from "$lib/store/simController";
    import Tooltip from "./ui/Tooltip.svelte";
    import Undo2 from "lucide-svelte/icons/undo-2";
    import Download from "lucide-svelte/icons/download";
    import RefreshCw from "lucide-svelte/icons/refresh-cw";
    import Trash2 from "lucide-svelte/icons/trash-2";

    const canUndo = $derived(store.hasPauseSnapshot);
    const canMin = $derived(store.seedText.trim().length > 0);
</script>

<div
    class="flex flex-col border-r border-black bg-white shrink-0 w-10 items-center py-2 gap-2"
>
    <Tooltip content="Crop canvas to fit simulation" side="right">
        <button
            class="w-7 h-7 flex flex-col items-center justify-center border border-black hover:bg-black hover:text-white group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-inherit"
            onclick={() => simController.handleMin()}
            disabled={!canMin}
        >
            <span class="text-[9px] font-bold leading-tight uppercase">Min</span>
        </button>
    </Tooltip>
    <Tooltip content="Maximize canvas (F)" side="right">
        <button
            class="w-7 h-7 flex flex-col items-center justify-center border border-black hover:bg-black hover:text-white group"
            onclick={() => simController.handleMax()}
        >
            <span class="text-[9px] font-bold leading-tight uppercase">Max</span>
        </button>
    </Tooltip>

    <div class="w-7 h-px bg-black/20 my-1"></div>

    <Tooltip content="Undo to last paused snapshot (Ctrl+Z)" side="right">
        <button
            class="w-7 h-7 flex flex-col items-center justify-center border border-black hover:bg-black hover:text-white group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-inherit"
            onclick={() => simController.handleUndo()}
            disabled={!canUndo}
            aria-label="Undo to last paused snapshot"
        >
            <Undo2 class="h-4 w-4" />
        </button>
    </Tooltip>

    <Tooltip content="Save as PNG (Ctrl+S)" side="right">
        <button
            class="w-7 h-7 flex flex-col items-center justify-center border border-black hover:bg-black hover:text-white group"
            onclick={() => simController.handleSave()}
            aria-label="Save as PNG"
        >
            <Download class="h-4 w-4" />
        </button>
    </Tooltip>

    <div class="w-7 h-px bg-black/20 my-1"></div>

    <Tooltip content="Reset (R)" side="right">
        <button
            class="w-7 h-7 flex flex-col items-center justify-center border border-black hover:bg-black hover:text-white group"
            onclick={() => simController.handleLoop()}
            aria-label="Reset simulation"
        >
            <RefreshCw class="h-4 w-4" />
        </button>
    </Tooltip>

    <Tooltip content="Clear simulation (Del)" side="right">
        <button
            class="w-7 h-7 flex flex-col items-center justify-center border border-black text-red-600 hover:bg-red-600 hover:text-white group"
            onclick={() => simController.handleTrash()}
            aria-label="Clear simulation"
        >
            <Trash2 class="h-4 w-4" />
        </button>
    </Tooltip>
</div>

