<script lang="ts">
  import { store } from "$lib/store/simStore.svelte";
  import { ColormapRegistry } from "$lib/colormaps/ColormapRegistry";

  const colormaps = ColormapRegistry.list();
</script>

<div class="flex flex-col gap-3 p-3 border-t border-black">
  <h3 class="text-xs font-bold uppercase tracking-wider text-black">
    Colormap
  </h3>

  <div class="flex flex-col gap-2">
    {#each colormaps as cm}
      <button
        class="border border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-none text-left
        {store.activeColormapId === cm.id
          ? 'bg-black text-white'
          : 'bg-white text-black hover:bg-base-200'}
        {cm.id === 'xmorphia' && store.activeColormapId !== 'xmorphia'
          ? 'text-blue-600'
          : ''}"
        onclick={() => {
          store.activeColormapId = cm.id;
        }}
      >
        {cm.label}
      </button>
    {/each}
  </div>
</div>
