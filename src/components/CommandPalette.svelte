<script lang="ts">
    import { Command, Dialog } from "bits-ui";
    import { actions, formatShortcut, groupActions } from "$lib/keyboard/actions";
    import { store } from "$lib/store/simStore.svelte";
    import KeyHint from "./KeyHint.svelte";

    const grouped = $derived(groupActions(actions));
    const categories = $derived(Object.keys(grouped) as (keyof typeof grouped)[]);

    function onSelect(actionId: string) {
        const action = actions.find((a) => a.id === actionId);
        if (action) {
            void action.run();
        }
        store.commandPaletteOpen = false;
    }
</script>

<Dialog.Root bind:open={store.commandPaletteOpen}>
    <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Content
            class="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 border border-black bg-white"
        >
            <Dialog.Title class="sr-only">Command palette</Dialog.Title>
            <Dialog.Description class="sr-only">
                Search commands and press Enter to run one.
            </Dialog.Description>

            <Command.Root
                label="Command palette"
                class="flex w-full flex-col overflow-hidden"
            >
                <div class="border-b border-black">
                    <Command.Input
                        placeholder="Type a command…"
                        class="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-brutal-secondary"
                    />
                </div>

                <Command.List class="max-h-[60vh] overflow-y-auto overflow-x-hidden">
                    <Command.Viewport class="p-1">
                        <Command.Empty
                            class="px-3 py-6 text-center text-xs text-brutal-secondary"
                        >
                            No commands found.
                        </Command.Empty>

                        {#each categories as category}
                            {@const items = grouped[category]}
                            <Command.Group value={category}>
                                <Command.GroupHeading
                                    class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-brutal-secondary"
                                >
                                    {category}
                                </Command.GroupHeading>
                                <Command.GroupItems>
                                    {#each items as action (action.id)}
                                        <Command.Item
                                            value={action.label}
                                            keywords={[action.id]}
                                            onSelect={() => onSelect(action.id)}
                                            class="group flex cursor-pointer select-none items-center justify-between px-3 py-2 text-sm outline-none hover:bg-black hover:text-white data-[selected]:bg-black data-[selected]:text-white"
                                        >
                                            <span>{action.label}</span>
                                            {#if action.shortcut}
                                                <KeyHint>{formatShortcut(action.shortcut)}</KeyHint>
                                            {/if}
                                        </Command.Item>
                                    {/each}
                                </Command.GroupItems>
                            </Command.Group>
                        {/each}
                    </Command.Viewport>
                </Command.List>
            </Command.Root>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
