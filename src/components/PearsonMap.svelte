<script lang="ts">
    import { store } from "$lib/store/simStore.svelte";

    let {
        open = $bindable(false),
    }: {
        open: boolean;
    } = $props();

    let dialogEl: HTMLDialogElement | null = null;
    let hoverFeed = $state(0);
    let hoverKill = $state(0);
    let hovering = $state(false);

    // Pearson parameter space bounds matching xmorphia.png
    // X axis = Kill (k): 0.03 (left) to 0.07 (right)
    // Y axis = Feed (F): 0.08 (top) to 0.01 (bottom)
    const KILL_MIN = 0.03;
    const KILL_MAX = 0.07;
    const FEED_MAX = 0.08; // top of image
    const FEED_MIN = 0.01; // bottom of image

    function killFromX(x: number, imgWidth: number): number {
        return KILL_MIN + (x / imgWidth) * (KILL_MAX - KILL_MIN);
    }

    function feedFromY(y: number, imgHeight: number): number {
        // Y=0 is top of image = FEED_MAX, Y=imgHeight is bottom = FEED_MIN
        return FEED_MAX - (y / imgHeight) * (FEED_MAX - FEED_MIN);
    }

    function handleClick(e: MouseEvent) {
        const el = e.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        store.params.feed = Number(feedFromY(y, rect.height).toFixed(4));
        store.params.kill = Number(killFromX(x, rect.width).toFixed(4));

        open = false;
    }

    function handleMove(e: MouseEvent) {
        const el = e.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        hovering = true;
        hoverFeed = Number(feedFromY(y, rect.height).toFixed(4));
        hoverKill = Number(killFromX(x, rect.width).toFixed(4));
    }

    function handleLeave() {
        hovering = false;
    }

    function closeModal() {
        open = false;
    }

    $effect(() => {
        if (open && dialogEl && !dialogEl.open) {
            dialogEl.showModal();
        } else if (!open && dialogEl && dialogEl.open) {
            dialogEl.close();
        }
    });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
    bind:this={dialogEl}
    class="backdrop:bg-black/50 p-0 m-auto border border-black bg-white shadow-2xl w-[90vw] max-w-lg"
    onclose={() => (open = false)}
    onclick={(e) => {
        if (e.target === dialogEl) closeModal();
    }}
>
    <div class="p-0">
        <div
            class="p-3 border-b border-black flex items-center justify-between"
        >
            <h3 class="text-xs font-bold uppercase tracking-wider text-black">
                Pearson Parameter Map
            </h3>
            <button
                class="text-xs font-bold text-black hover:text-red-600"
                onclick={closeModal}>✕</button
            >
        </div>

        <div class="p-3">
            <p class="text-xs text-black/60 mb-2">
                Click to set Feed & Kill. Current: F={store.params.feed.toFixed(
                    4,
                )}, K={store.params.kill.toFixed(4)}
            </p>
            <p class="text-xs text-black/40 mb-1">
                X: Kill (0.03 → 0.07) &nbsp; Y: Feed (0.08 ↓ 0.01)
            </p>

            <div
                class="relative w-full cursor-crosshair border border-black"
                role="button"
                tabindex="0"
                onclick={handleClick}
                onmousemove={handleMove}
                onmouseleave={handleLeave}
                onkeydown={(e) => {
                    if (e.key === "Escape") closeModal();
                }}
            >
                <img
                    src="/xmorphia-map.png"
                    alt="Pearson parameter space"
                    class="w-full block"
                    draggable="false"
                />
            </div>

            {#if hovering}
                <div
                    class="text-center mt-1 font-mono text-[10px] text-black/60"
                >
                    F: {hoverFeed.toFixed(4)} &nbsp; K: {hoverKill.toFixed(4)}
                </div>
            {/if}
        </div>
    </div>
</dialog>
