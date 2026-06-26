<script lang="ts">
    import type { Snippet } from "svelte";
    import { Toolbar } from "bits-ui";
    import Tooltip from "./ui/Tooltip.svelte";
    import ZoomIn from "lucide-svelte/icons/zoom-in";
    import ZoomOut from "lucide-svelte/icons/zoom-out";
    import Crosshair from "lucide-svelte/icons/crosshair";

    let {
        children,
        contentMinWidth = 0,
        contentMinHeight = 0,
    }: {
        children: Snippet;
        contentMinWidth?: number;
        contentMinHeight?: number;
    } = $props();

    let containerEl: HTMLDivElement;

    let scale = $state(1);
    let translateX = $state(0);
    let translateY = $state(0);

    let isDragging = $state(false);
    let isSpaceDown = $state(false);
    let startPanX = 0;
    let startPanY = 0;

    const MIN_SCALE = 0.1;
    const MAX_SCALE = 5.0;

    const cursor = $derived(
        isDragging ? "grabbing" : isSpaceDown ? "grab" : "default",
    );

    function handleWheel(e: WheelEvent) {
        e.preventDefault();

        if (e.ctrlKey || e.metaKey) {
            const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = clampScale(scale * zoomDelta);

            if (containerEl) {
                const rect = containerEl.getBoundingClientRect();
                const mouseCenterX = e.clientX - rect.left - rect.width / 2;
                const mouseCenterY = e.clientY - rect.top - rect.height / 2;

                const pointX = (mouseCenterX - translateX) / scale;
                const pointY = (mouseCenterY - translateY) / scale;

                translateX = mouseCenterX - pointX * newScale;
                translateY = mouseCenterY - pointY * newScale;
            }

            scale = newScale;
        } else {
            translateX -= e.deltaX;
            translateY -= e.deltaY;
        }
    }

    function handlePointerDown(e: PointerEvent) {
        const canPan =
            e.button === 1 ||
            (e.button === 0 && isSpaceDown) ||
            (e.button === 0 && e.target === containerEl);

        if (!canPan) return;

        e.preventDefault();
        isDragging = true;
        startPanX = e.clientX - translateX;
        startPanY = e.clientY - translateY;
        containerEl?.setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e: PointerEvent) {
        if (!isDragging) return;
        translateX = e.clientX - startPanX;
        translateY = e.clientY - startPanY;
    }

    function handlePointerUp(e: PointerEvent) {
        if (!isDragging) return;
        isDragging = false;
        containerEl?.releasePointerCapture(e.pointerId);
    }

    function handleKeyDown(e: KeyboardEvent) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

        if (e.code === "Space") {
            isSpaceDown = true;
            if (e.target === containerEl) {
                e.preventDefault();
            }
        }

        if (e.ctrlKey || e.metaKey) {
            if (e.key === "0" || e.code === "Numpad0") {
                e.preventDefault();
                resetView();
            } else if (
                e.key === "=" ||
                e.key === "+" ||
                e.code === "NumpadAdd"
            ) {
                e.preventDefault();
                zoomCenter(1.1);
            } else if (e.key === "-" || e.code === "NumpadSubtract") {
                e.preventDefault();
                zoomCenter(0.9);
            }
        }
    }

    function handleKeyUp(e: KeyboardEvent) {
        if (e.code === "Space") {
            isSpaceDown = false;
        }
    }

    function clampScale(value: number): number {
        return Math.min(Math.max(MIN_SCALE, value), MAX_SCALE);
    }

    function zoomCenter(factor: number) {
        const newScale = clampScale(scale * factor);
        const pointX = -translateX / scale;
        const pointY = -translateY / scale;

        translateX = -pointX * newScale;
        translateY = -pointY * newScale;
        scale = newScale;
    }

    function resetView() {
        scale = 1;
        translateX = 0;
        translateY = 0;
    }

    export function centerCanvas() {
        translateX = 0;
        translateY = 0;
    }

    export function getScale(): number {
        return scale;
    }
</script>

<svelte:window onkeydown={handleKeyDown} onkeyup={handleKeyUp} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    bind:this={containerEl}
    class="w-full h-full relative overflow-hidden bg-neutral-100 touch-none select-none"
    style="cursor: {cursor};"
    onwheel={handleWheel}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
>
    <div
        class="absolute flex items-center justify-center"
        style="
            width: 10000px;
            height: 10000px;
            left: 50%;
            top: 50%;
            margin-left: -5000px;
            margin-top: -5000px;
            transform: translate({translateX}px, {translateY}px) scale({scale});
        "
    >
        {@render children()}
    </div>

    <Toolbar.Root
        class="absolute bottom-4 right-4 flex items-stretch bg-white border border-black shadow-sm z-50"
    >
        <Tooltip content="Zoom out (Ctrl + -)" side="top">
            <Toolbar.Button
                class="w-8 h-8 flex items-center justify-center hover:bg-black hover:text-white border-r border-black transition-colors"
                onclick={() => zoomCenter(0.9)}
                aria-label="Zoom out"
            >
                <ZoomOut class="h-4 w-4" />
            </Toolbar.Button>
        </Tooltip>

        <Tooltip content="Reset view (Ctrl + 0)" side="top">
            <Toolbar.Button
                class="h-8 px-2 flex items-center justify-center hover:bg-black hover:text-white border-r border-black font-mono text-xs min-w-[3rem] transition-colors"
                onclick={resetView}
                aria-label="Reset view"
            >
                {Math.round(scale * 100)}%
            </Toolbar.Button>
        </Tooltip>

        <Tooltip content="Zoom in (Ctrl + +)" side="top">
            <Toolbar.Button
                class="w-8 h-8 flex items-center justify-center hover:bg-black hover:text-white border-r border-black transition-colors"
                onclick={() => zoomCenter(1.1)}
                aria-label="Zoom in"
            >
                <ZoomIn class="h-4 w-4" />
            </Toolbar.Button>
        </Tooltip>

        <Tooltip content="Center canvas" side="top">
            <Toolbar.Button
                class="w-8 h-8 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                onclick={centerCanvas}
                aria-label="Center canvas"
            >
                <Crosshair class="h-4 w-4" />
            </Toolbar.Button>
        </Tooltip>
    </Toolbar.Root>
</div>
