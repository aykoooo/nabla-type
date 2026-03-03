<script lang="ts">
    import type { Snippet } from "svelte";

    // Props: current canvas dimensions, callback for resize, and children slot
    let {
        width = $bindable(512),
        height = $bindable(512),
        onresize,
        children,
    }: {
        width: number;
        height: number;
        onresize?: (w: number, h: number) => void;
        children: Snippet;
    } = $props();

    let containerEl: HTMLDivElement;

    // Drag state
    let dragging = $state(false);
    let activeHandle = $state("");
    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;
    let previewW = $state(0);
    let previewH = $state(0);

    const MIN_SIZE = 64;

    function handleStyle(handle: string): string {
        const S = 18;
        const H = S / 2;
        switch (handle) {
            case "nw":
                return `width:${S}px; height:${S}px; top:-${H}px; left:-${H}px;`;
            case "ne":
                return `width:${S}px; height:${S}px; top:-${H}px; right:-${H}px;`;
            case "sw":
                return `width:${S}px; height:${S}px; bottom:-${H}px; left:-${H}px;`;
            case "se":
                return `width:${S}px; height:${S}px; bottom:-${H}px; right:-${H}px;`;
            case "n":
                return `height:${S}px; top:-${H}px; left:24px; right:24px;`;
            case "s":
                return `height:${S}px; bottom:-${H}px; left:24px; right:24px;`;
            case "w":
                return `width:${S}px; left:-${H}px; top:24px; bottom:24px;`;
            case "e":
                return `width:${S}px; right:-${H}px; top:24px; bottom:24px;`;
            default:
                return "";
        }
    }

    function cursorClass(handle: string): string {
        const map: Record<string, string> = {
            n: "cursor-n-resize",
            s: "cursor-s-resize",
            e: "cursor-e-resize",
            w: "cursor-w-resize",
            nw: "cursor-nw-resize",
            ne: "cursor-ne-resize",
            sw: "cursor-sw-resize",
            se: "cursor-se-resize",
        };
        return map[handle] || "";
    }

    function onHandleDown(e: MouseEvent, handle: string) {
        e.preventDefault();
        e.stopPropagation();
        dragging = true;
        activeHandle = handle;
        startX = e.clientX;
        startY = e.clientY;
        startW = width;
        startH = height;
        previewW = width;
        previewH = height;

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    }

    function onMouseMove(e: MouseEvent) {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newW = startW;
        let newH = startH;

        if (activeHandle.includes("e"))
            newW = Math.max(MIN_SIZE, startW + dx * 2);
        if (activeHandle.includes("w"))
            newW = Math.max(MIN_SIZE, startW - dx * 2);
        if (activeHandle.includes("s"))
            newH = Math.max(MIN_SIZE, startH + dy * 2);
        if (activeHandle.includes("n"))
            newH = Math.max(MIN_SIZE, startH - dy * 2);

        previewW = newW;
        previewH = newH;
    }

    function onMouseUp() {
        if (!dragging) return;
        dragging = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);

        width = previewW;
        height = previewH;
        onresize?.(previewW, previewH);
        activeHandle = "";
    }

    const handles = ["n", "s", "e", "w", "nw", "ne", "sw", "se"] as const;

    function isCornerHandle(handle: string): boolean {
        return handle.length === 2;
    }
</script>

<div
    class="relative inline-block flex items-center justify-center"
    bind:this={containerEl}
>
    <!--
    MS Paint style: During drag, the wrapper expands to previewW x previewH
    but the canvas inside stays at its original pixel size (width x height).
    This produces the "empty space around unchanged canvas" look.
    On mouseup, width/height update and onresize fires, which actually
    resizes the simulation.
  -->
    <div
        class="relative bg-white flex items-center justify-center"
        style="width: {dragging ? previewW : width}px; height: {dragging
            ? previewH
            : height}px;"
    >
        {@render children()}
    </div>

    <!-- Resize handles: MS Paint style thin line markers with larger invisible hit areas -->
    {#each handles as handle}
        <button
            type="button"
            class="absolute z-20 bg-transparent border-0 p-0 transition-colors {cursorClass(
                handle,
            )} {activeHandle === handle
                ? 'text-black'
                : 'text-neutral-500 hover:text-black'}"
            style="{handleStyle(
                handle,
            )}; filter: drop-shadow(0px 0px 1px rgba(255,255,255,0.8));"
            onmousedown={(e) => onHandleDown(e, handle)}
            aria-label={`Resize ${handle}`}
        >
            {#if handle === "n" || handle === "s"}
                <span
                    class="pointer-events-none absolute left-1/2 -translate-x-1/2 w-5 h-px bg-current"
                    style={handle === "n" ? "top: 2px;" : "bottom: 2px;"}
                ></span>
            {:else if handle === "e" || handle === "w"}
                <span
                    class="pointer-events-none absolute top-1/2 -translate-y-1/2 w-px h-5 bg-current"
                    style={handle === "w" ? "left: 2px;" : "right: 2px;"}
                ></span>
            {:else if isCornerHandle(handle)}
                <span
                    class="pointer-events-none absolute w-4 h-px bg-current"
                    style={handle === "nw"
                        ? "top: 2px; left: 2px;"
                        : handle === "ne"
                          ? "top: 2px; right: 2px;"
                          : handle === "sw"
                            ? "bottom: 2px; left: 2px;"
                            : "bottom: 2px; right: 2px;"}
                ></span>
                <span
                    class="pointer-events-none absolute w-px h-4 bg-current"
                    style={handle === "nw"
                        ? "top: 2px; left: 2px;"
                        : handle === "ne"
                          ? "top: 2px; right: 2px;"
                          : handle === "sw"
                            ? "bottom: 2px; left: 2px;"
                            : "bottom: 2px; right: 2px;"}
                ></span>
            {/if}
        </button>
    {/each}

    <!-- Preview outline during drag: black dashed border -->
    {#if dragging}
        <div
            class="absolute border border-dashed border-black pointer-events-none z-10"
            style="width: {previewW}px; height: {previewH}px; top: 0; left: 0; outline: 1px dashed white;"
        ></div>
        <div
            class="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white border border-black px-2 py-0.5 text-[10px] font-mono font-bold z-30 whitespace-nowrap"
        >
            {previewW} × {previewH}
        </div>
    {/if}
</div>
