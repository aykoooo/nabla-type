<script lang="ts">
    import { store } from "$lib/store/simStore.svelte";
</script>

<div class="flex items-center gap-4 px-3 py-1 text-xs border-t border-black/20">
    <span class="text-black/50">Iterations:</span>
    <span class="font-mono text-black w-16 text-right"
        >{store.iterationCount}</span
    >
    <span class="text-black/50">Fps:</span>
    <span class="font-mono text-black w-10 text-right">{store.fps}</span>
</div>
