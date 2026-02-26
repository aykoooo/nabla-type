<script lang="ts">
    // Placeholder layer strip for future multi-layer support
    const layers = [
        { id: 1, label: "Layer 1", active: true },
        { id: 2, label: "Layer 2", active: false },
        { id: 3, label: "Layer 3", active: false },
        { id: 4, label: "Layer 4", active: false },
    ];
</script>

<div class="flex flex-col gap-1 overflow-y-auto p-1 w-12 shrink-0">
    {#each layers as layer}
        <div
            class="border aspect-square flex items-center justify-center text-[0.6rem] font-mono font-bold select-none
        {layer.active
                ? 'border-black bg-black text-white'
                : 'border-black/30 text-black/40 bg-white hover:bg-neutral-100'}"
        >
            {layer.id}
        </div>
    {/each}
</div>
