<script lang="ts">
    import { Dialog } from "bits-ui";
    import { actions, formatShortcut, groupActions } from "$lib/keyboard/actions";
    import { store } from "$lib/store/simStore.svelte";
    import KeyHint from "./KeyHint.svelte";

    const grouped = $derived(groupActions(actions));
    const categories = $derived(Object.keys(grouped) as (keyof typeof grouped)[]);
</script>

<Dialog.Root bind:open={store.keyboardHelpOpen}>
    <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Content
            class="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 border border-black bg-white shadow-[8px_8px_0px_#000]"
        >
            <Dialog.Title class="sr-only">Keyboard shortcuts</Dialog.Title>
            <Dialog.Description class="sr-only">
                Reference of available keyboard shortcuts.
            </Dialog.Description>

            <div class="max-h-[70vh] overflow-y-auto overflow-x-hidden p-4">
                <div class="mb-4 border-b border-black pb-2">
                    <h2 class="text-sm font-bold uppercase tracking-widest">
                        Keyboard shortcuts
                    </h2>
                    <p class="mt-1 text-[10px] text-brutal-secondary">
                        Single-key canvas shortcuts can be disabled in Advanced Parameters.
                    </p>
                </div>

                <div class="flex flex-col gap-4">
                    {#each categories as category}
                        {@const items = grouped[category]}
                        <div>
                            <h3 class="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-brutal-secondary">
                                {category}
                            </h3>
                            <div class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-xs">
                                {#each items as action (action.id)}
                                    <span>{action.label}</span>
                                    {#if action.shortcut}
                                        <KeyHint>{formatShortcut(action.shortcut)}</KeyHint>
                                    {:else}
                                        <span></span>
                                    {/if}
                                {/each}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
