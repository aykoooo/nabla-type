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
        const S = 8;
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
                return `height:${S}px; top:-${H}px; left:${S}px; right:${S}px;`;
            case "s":
                return `height:${S}px; bottom:-${H}px; left:${S}px; right:${S}px;`;
            case "w":
                return `width:${S}px; left:-${H}px; top:${S}px; bottom:${S}px;`;
            case "e":
                return `width:${S}px; right:-${H}px; top:${S}px; bottom:${S}px;`;
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

        if (activeHandle.includes("e")) newW = Math.max(MIN_SIZE, startW + dx);
        if (activeHandle.includes("w")) newW = Math.max(MIN_SIZE, startW - dx);
        if (activeHandle.includes("s")) newH = Math.max(MIN_SIZE, startH + dy);
        if (activeHandle.includes("n")) newH = Math.max(MIN_SIZE, startH - dy);

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
</script>

<div class="relative inline-block" bind:this={containerEl}>
    <!--
    MS Paint style: During drag, the wrapper expands to previewW x previewH
    but the canvas inside stays at its original pixel size (width x height).
    This produces the "empty space around unchanged canvas" look.
    On mouseup, width/height update and onresize fires, which actually
    resizes the simulation.
  -->
    <div
        class="relative bg-white"
        style="width: {dragging ? previewW : width}px; height: {dragging
            ? previewH
            : height}px;"
    >
        {@render children()}
    </div>

    <!-- Resize handles: flat black squares -->
    {#each handles as handle}
        <button
            type="button"
            class="absolute bg-white border border-black z-20 hover:bg-black {cursorClass(
                handle,
            )}"
            style={handleStyle(handle)}
            onmousedown={(e) => onHandleDown(e, handle)}
            aria-label={`Resize ${handle}`}
        ></button>
    {/each}

    <!-- Preview outline during drag: black dashed border -->
    {#if dragging}
        <div
            class="absolute border border-dashed border-black pointer-events-none z-10"
            style="width: {previewW}px; height: {previewH}px; top: 0; left: 0;"
        ></div>
        <div
            class="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white border border-black px-2 py-0.5 text-[10px] font-mono font-bold z-30 whitespace-nowrap"
        >
            {previewW} × {previewH}
        </div>
    {/if}
</div>
