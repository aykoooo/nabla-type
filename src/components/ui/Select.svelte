<script lang="ts">
    import { Select } from "bits-ui";
    import ChevronDown from "lucide-svelte/icons/chevron-down";
    import Check from "lucide-svelte/icons/check";

    let {
        value = $bindable<string>(),
        items,
        placeholder = "Select...",
        class: className = "",
        matchTriggerWidth = false,
        onValueChange
    }: {
        value?: string;
        items: { value: string; label: string }[];
        placeholder?: string;
        class?: string;
        matchTriggerWidth?: boolean;
        onValueChange?: (value: string | undefined) => void;
    } = $props();

    let triggerRef = $state<HTMLButtonElement | null>(null);

    function handleValueChange(v: string | undefined) {
        onValueChange?.(v);
        // Blur the trigger after selection so global shortcuts (e.g. Space) are
        // not captured by the select on the next keypress.
        triggerRef?.blur();
    }

    const contentBase = "z-50 border border-black bg-white shadow-md outline-none";
    const contentClass = $derived(
        matchTriggerWidth
            ? `${contentBase} w-[var(--bits-select-anchor-width)] min-w-[var(--bits-select-anchor-width)]`
            : `${contentBase} min-w-32`,
    );

    const selectedLabel = $derived(
        items.find((i) => i.value === value)?.label ?? placeholder
    );
</script>

<Select.Root type="single" bind:value onValueChange={handleValueChange}>
    <Select.Trigger bind:ref={triggerRef} class="flex h-7 w-full items-center justify-between border border-black bg-white px-2 py-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black {className}">
        <span class="truncate">{selectedLabel}</span>
        <ChevronDown class="h-3.5 w-3.5 opacity-70" />
    </Select.Trigger>
    <Select.Portal>
        <Select.Content class={contentClass} sideOffset={4}>
            <Select.Viewport class="p-1">
                {#each items as item (item.value)}
                    <Select.Item
                        value={item.value}
                        label={item.label}
                        class="relative flex w-full cursor-pointer select-none items-center py-1.5 pl-2 pr-8 text-xs outline-none hover:bg-neutral-100 data-[highlighted]:bg-black data-[highlighted]:text-white"
                    >
                        {#snippet children({ selected })}
                            <span class="truncate">{item.label}</span>
                            {#if selected}
                                <span class="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                                    <Check class="h-3 w-3" />
                                </span>
                            {/if}
                        {/snippet}
                    </Select.Item>
                {/each}
            </Select.Viewport>
        </Select.Content>
    </Select.Portal>
</Select.Root>
