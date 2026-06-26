<script lang="ts">
  import type { Snippet } from "svelte";

  let { title, open = $bindable(false), children }: {
    title: string;
    open?: boolean;
    children: Snippet;
  } = $props();
</script>

<details
  class="group border-b border-black bg-white"
  {open}
  ontoggle={(e) => (open = e.currentTarget.open)}
>
  <summary
    class="flex justify-between items-center cursor-pointer px-3 py-2 text-xs font-bold uppercase tracking-wider bg-neutral-50 hover:bg-neutral-100 select-none border-b border-transparent group-open:border-black transition-colors list-none [&::-webkit-details-marker]:hidden"
  >
    {title}
    <span class="font-mono text-[10px] group-open:rotate-180 transition-transform">▼</span>
  </summary>
  <div class="p-3 bg-white">
    {@render children()}
  </div>
</details>
