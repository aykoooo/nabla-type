<script lang="ts">
    let {
        children,
        class: className = "",
    }: {
        children: import('svelte').Snippet;
        class?: string;
    } = $props();
</script>

<kbd
    class="inline-block border border-black bg-neutral-100 px-1 text-[10px] font-mono font-semibold uppercase leading-tight text-black group-hover:bg-white group-hover:text-black group-data-[selected]:bg-white group-data-[selected]:text-black {className}"
>
    {@render children()}
</kbd>
