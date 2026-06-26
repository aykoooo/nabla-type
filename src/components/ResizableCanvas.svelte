<script lang="ts">
    import type { Snippet } from "svelte";
    import { store } from "$lib/store/simStore.svelte";
    import { simController } from "$lib/store/simController";
    import { applyAspect } from "$lib/utils/resolutionUtils";
    import { ColormapRegistry } from "$lib/colormaps/ColormapRegistry";
    import { buildLUTFromSpec } from "$lib/colormaps/spec";
    import { setGlobalCursor, restoreGlobalCursor } from "$lib/utils/cursorLock";

    interface Props {
        width?: number;
        height?: number;
        onresize?: (w: number, h: number) => void;
        children: Snippet;
    }

    let {
        width = $bindable(512),
        height = $bindable(512),
        onresize,
        children,
    }: Props = $props();

    let isDragging = $state(false);
    let activeHandle = $state<HandleDirection | "">("");

    let startMouseX = 0;
    let startMouseY = 0;
    let startWidth = $state(0);
    let startHeight = $state(0);

    let previewWidth = $state(0);
    let previewHeight = $state(0);
    let previewX = $state(0);
    let previewY = $state(0);

    const MIN_SIZE = 64;

    type HandleDirection = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

    const HANDLE_DIRECTIONS: Record<HandleDirection, [number, number]> = {
        n: [0, -1],
        s: [0, 1],
        e: [1, 0],
        w: [-1, 0],
        nw: [-1, -1],
        ne: [1, -1],
        sw: [-1, 1],
        se: [1, 1],
    };

    const HANDLES = Object.keys(HANDLE_DIRECTIONS) as HandleDirection[];

    const previewBgColor = $derived.by(() => {
        if (store.activeColormapId === "custom") {
            const stops = store.customGradientStops;
            if (stops.length > 0) {
                const sorted = [...stops].sort(
                    (a, b) => a.position - b.position,
                );
                return sorted[0].color;
            }
            return "#ffffff";
        }

        try {
            const spec = ColormapRegistry.get(store.activeColormapId);
            const lut = buildLUTFromSpec(spec);
            return `rgb(${lut[0]}, ${lut[1]}, ${lut[2]})`;
        } catch {
            return "#ffffff";
        }
    });

    function getCursorStyle(handle: HandleDirection): string {
        return `${handle}-resize`;
    }

    function onHandleMouseDown(e: MouseEvent, handle: HandleDirection) {
        e.preventDefault();
        e.stopPropagation();

        isDragging = true;
        activeHandle = handle;

        startMouseX = e.clientX;
        startMouseY = e.clientY;
        startWidth = width;
        startHeight = height;

        previewWidth = width;
        previewHeight = height;
        previewX = 0;
        previewY = 0;

        setGlobalCursor(getCursorStyle(handle));

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    }

    function onMouseMove(e: MouseEvent) {
        if (!isDragging) return;

        const scale = simController.viewportRef?.getScale?.() ?? 1;
        const safeScale = scale === 0 ? 1 : scale;
        const dx = (e.clientX - startMouseX) / safeScale;
        const dy = (e.clientY - startMouseY) / safeScale;

        const [dirX, dirY] = activeHandle
            ? HANDLE_DIRECTIONS[activeHandle]
            : [0, 0];
        const symmetrical = e.shiftKey;

        let targetW = startWidth;
        let targetH = startHeight;

        const multiplier = symmetrical ? 2 : 1;
        if (dirX !== 0) targetW = startWidth + dx * dirX * multiplier;
        if (dirY !== 0) targetH = startHeight + dy * dirY * multiplier;

        targetW = Math.max(MIN_SIZE, targetW);
        targetH = Math.max(MIN_SIZE, targetH);

        let finalW = targetW;
        let finalH = targetH;

        if (store.resolutionLocked && store.aspectMode !== "free") {
            const primaryAxis =
                dirX === 0 ? "height" : dirY === 0 ? "width" : "max";

            const constrained = applyAspect(
                targetW,
                targetH,
                store.aspectMode,
                true,
                primaryAxis,
                store.customAspectRatio,
            );

            finalW = constrained.width;
            finalH = constrained.height;
        }

        previewWidth = finalW;
        previewHeight = finalH;
        store.resizingResolution = { width: finalW, height: finalH };

        if (symmetrical) {
            previewX = (startWidth - finalW) / 2;
            previewY = (startHeight - finalH) / 2;
        } else {
            previewX =
                dirX === -1 ? startWidth - finalW : dirX === 1 ? 0 : (startWidth - finalW) / 2;
            previewY =
                dirY === -1 ? startHeight - finalH : dirY === 1 ? 0 : (startHeight - finalH) / 2;
        }
    }

    function onMouseUp() {
        if (!isDragging) return;

        isDragging = false;
        restoreGlobalCursor();
        store.resizingResolution = null;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);

        width = previewWidth;
        height = previewHeight;

        onresize?.(previewWidth, previewHeight);

        activeHandle = "";
        previewX = 0;
        previewY = 0;
    }

    $effect(() => {
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            if (isDragging) {
                restoreGlobalCursor();
                store.resizingResolution = null;
            }
        };
    });
</script>

<div class="canvas-mount-point" style:width="{width}px" style:height="{height}px">
    <div
        class="preview-boundary z-10"
        class:is-active={isDragging}
        class:is-idle={!isDragging}
        style:left="{isDragging ? previewX : 0}px"
        style:top="{isDragging ? previewY : 0}px"
        style:width="{isDragging ? previewWidth : width}px"
        style:height="{isDragging ? previewHeight : height}px"
    >
        <div
            class="content-mask transform-gpu"
            style:background-color={isDragging ? previewBgColor : "transparent"}
            style:overflow={isDragging ? "hidden" : "visible"}
        >
            <div
                class={isDragging ? "content-fixed" : "content-fluid"}
                style:width={isDragging ? `${startWidth}px` : "100%"}
                style:height={isDragging ? `${startHeight}px` : "100%"}
            >
                {@render children()}
            </div>
        </div>

        {#if isDragging}
            <div class="preview-dashed-border z-10"></div>

            <div class="metrics-badge z-20">
                {Math.round(previewWidth)} × {Math.round(previewHeight)}
            </div>
        {/if}

        {#if !isDragging}
            {#each HANDLES as handle}
                <button
                    type="button"
                    class="drag-handle z-30 {activeHandle === handle ? 'text-black' : 'text-neutral-500 hover:text-black'}"
                    style="cursor: {handle}-resize"
                    onmousedown={(e) => onHandleMouseDown(e, handle)}
                    class:h-nw={handle === "nw"}
                    class:h-ne={handle === "ne"}
                    class:h-sw={handle === "sw"}
                    class:h-se={handle === "se"}
                    class:h-n={handle === "n"}
                    class:h-s={handle === "s"}
                    class:h-w={handle === "w"}
                    class:h-e={handle === "e"}
                    aria-label={`Resize ${handle}`}
                >
                    {#if handle === "n" || handle === "s"}
                        <span
                            class="handle-line handle-n-s"
                            class:h-line-top={handle === "n"}
                            class:h-line-bottom={handle === "s"}
                        ></span>
                    {:else if handle === "e" || handle === "w"}
                        <span
                            class="handle-line handle-e-w"
                            class:h-line-left={handle === "w"}
                            class:h-line-right={handle === "e"}
                        ></span>
                    {:else}
                        <span
                            class="handle-line handle-corner-h"
                            class:h-line-top={handle.includes("n")}
                            class:h-line-bottom={handle.includes("s")}
                            class:h-line-left={handle.includes("w")}
                            class:h-line-right={handle.includes("e")}
                        ></span>
                        <span
                            class="handle-line handle-corner-v"
                            class:h-line-top={handle.includes("n")}
                            class:h-line-bottom={handle.includes("s")}
                            class:h-line-left={handle.includes("w")}
                            class:h-line-right={handle.includes("e")}
                        ></span>
                    {/if}
                </button>
            {/each}
        {/if}
    </div>
</div>

<style>
    .canvas-mount-point {
        position: relative;
        display: block;
        transform: translateZ(0);
    }

    .preview-boundary.is-active {
        position: absolute;
    }

    .preview-boundary.is-idle {
        position: relative;
        width: 100%;
        height: 100%;
    }

    .content-mask {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .content-fixed {
        position: relative;
    }

    .content-fluid {
        position: relative;
        width: 100%;
        height: 100%;
    }

    .preview-dashed-border {
        position: absolute;
        inset: 0;
        border: 1px dashed black;
        pointer-events: none;
        box-sizing: border-box;
    }

    .metrics-badge {
        position: absolute;
        bottom: -1.5rem;
        left: 50%;
        transform: translateX(-50%);
        background-color: white;
        border: 1px solid black;
        padding: 0.125rem 0.5rem;
        font-size: 10px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace;
        font-weight: 700;
        white-space: nowrap;
    }

    .drag-handle {
        position: absolute;
        background-color: transparent;
        border: none;
        padding: 0;
        transition: color 0.15s ease-in-out;
    }

    /* Placements: larger invisible hit areas around edges */
    .h-nw {
        width: 28px;
        height: 28px;
        top: -14px;
        left: -14px;
        z-index: 40;
    }
    .h-ne {
        width: 28px;
        height: 28px;
        top: -14px;
        right: -14px;
        z-index: 40;
    }
    .h-sw {
        width: 28px;
        height: 28px;
        bottom: -14px;
        left: -14px;
        z-index: 40;
    }
    .h-se {
        width: 28px;
        height: 28px;
        bottom: -14px;
        right: -14px;
        z-index: 40;
    }
    .h-n {
        height: 22px;
        top: -11px;
        left: 18px;
        right: 18px;
    }
    .h-s {
        height: 22px;
        bottom: -11px;
        left: 18px;
        right: 18px;
    }
    .h-w {
        width: 22px;
        left: -11px;
        top: 18px;
        bottom: 18px;
    }
    .h-e {
        width: 22px;
        right: -11px;
        top: 18px;
        bottom: 18px;
    }

    /* Lines */
    .handle-line {
        pointer-events: none;
        position: absolute;
        background-color: currentColor;
    }

    .handle-n-s {
        left: 50%;
        transform: translateX(-50%);
        width: 1.25rem;
        height: 1px;
    }

    .handle-e-w {
        top: 50%;
        transform: translateY(-50%);
        width: 1px;
        height: 1.25rem;
    }

    .handle-corner-h {
        width: 1rem;
        height: 1px;
    }

    .handle-corner-v {
        width: 1px;
        height: 1rem;
    }

    /* Target edges */
    .h-line-top {
        top: 2px;
    }
    .h-line-bottom {
        bottom: 2px;
    }
    .h-line-left {
        left: 2px;
    }
    .h-line-right {
        right: 2px;
    }
</style>
