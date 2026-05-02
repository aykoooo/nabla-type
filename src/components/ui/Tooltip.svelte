<script lang="ts">
    import { Tooltip } from "bits-ui";
    import type { Snippet } from "svelte";

    let {
        content,
        children,
        delayDuration = 200,
        side = "top",
        ...restProps
    }: {
        content: string;
        children: Snippet;
        delayDuration?: number;
        side?: "top" | "right" | "bottom" | "left";
        [key: string]: unknown;
    } = $props();
</script>

<Tooltip.Root {delayDuration} {...restProps}>
    <Tooltip.Trigger>
        {#snippet child({ props })}
            <div {...props} class="contents">
                {@render children()}
            </div>
        {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Portal>
        <Tooltip.Content
            {side}
            class="z-50 px-2 py-1 text-[10px] bg-black text-white shadow focus:outline-none font-semibold tracking-wide max-w-xs text-center"
            sideOffset={6}
        >
            <Tooltip.Arrow class="rounded-[2px] border-none" />
            {content}
        </Tooltip.Content>
    </Tooltip.Portal>
</Tooltip.Root>
