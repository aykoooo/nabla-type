<script lang="ts">
    import type { Snippet } from "svelte";

    let { children }: { children: Snippet } = $props();

    let containerEl: HTMLDivElement;
    let contentEl: HTMLDivElement;

    let scale = $state(1);
    let translateX = $state(0);
    let translateY = $state(0);

    let isDragging = $state(false);
    let isSpaceDown = $state(false);
    let startPanX = 0;
    let startPanY = 0;

    const MIN_SCALE = 0.1;
    const MAX_SCALE = 5.0;

    function handleWheel(e: WheelEvent) {
        e.preventDefault();

        if (e.ctrlKey || e.metaKey) {
            // Zooming
            const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.min(
                Math.max(MIN_SCALE, scale * zoomDelta),
                MAX_SCALE,
            );

            // Zoom relative to mouse pointer position
            if (containerEl) {
                const rect = containerEl.getBoundingClientRect();

                // Get pointer position relative to viewport center
                const mouseCenterX = e.clientX - rect.left - rect.width / 2;
                const mouseCenterY = e.clientY - rect.top - rect.height / 2;

                // Position of pointer in content's unscaled coordinate space
                const pointX = (mouseCenterX - translateX) / scale;
                const pointY = (mouseCenterY - translateY) / scale;

                // Adjust translations to keep that point under the pointer
                translateX = mouseCenterX - pointX * newScale;
                translateY = mouseCenterY - pointY * newScale;
            }

            scale = newScale;
        } else {
            // Panning
            translateX -= e.deltaX;
            translateY -= e.deltaY;
        }
    }

    function handlePointerDown(e: PointerEvent) {
        // Start panning on middle mouse (button 1) or space + left click
        if (e.button === 1 || (e.button === 0 && isSpaceDown)) {
            e.preventDefault();
            isDragging = true;
            startPanX = e.clientX - translateX;
            startPanY = e.clientY - translateY;
            // Capture pointer so dragging outside the div still works
            containerEl?.setPointerCapture(e.pointerId);
        } else if (e.button === 0 && e.target === containerEl) {
            // Also allow panning by dragging the empty space (the container itself)
            e.preventDefault();
            isDragging = true;
            startPanX = e.clientX - translateX;
            startPanY = e.clientY - translateY;
            containerEl?.setPointerCapture(e.pointerId);
        }
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
        // Only trigger if we aren't typing in an input
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

        if (e.code === "Space") {
            isSpaceDown = true;
            if (e.target === containerEl) {
                // Prevent spacebar scrolling
                e.preventDefault();
            }
        }

        if (e.ctrlKey || e.metaKey) {
            if (e.key === "0" || e.code === "Numpad0") {
                e.preventDefault();
                resetZoom();
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

    function zoomCenter(factor: number) {
        if (!containerEl) return;
        const newScale = Math.min(
            Math.max(MIN_SCALE, scale * factor),
            MAX_SCALE,
        );

        const rect = containerEl.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const pointX = (centerX - translateX) / scale;
        const pointY = (centerY - translateY) / scale;

        translateX = centerX - pointX * newScale;
        translateY = centerY - pointY * newScale;

        scale = newScale;
    }

    function resetZoom() {
        scale = 1;
        translateX = 0;
        translateY = 0;
    }
</script>

<svelte:window on:keydown={handleKeyDown} on:keyup={handleKeyUp} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    bind:this={containerEl}
    class="w-full h-full relative overflow-hidden bg-neutral-100 touch-none select-none"
    style="cursor: {isSpaceDown
        ? 'grab'
        : isDragging
          ? 'grabbing'
          : 'default'};"
    onwheel={handleWheel}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
>
    <!-- Viewport content container (virtually infinite size to center the children) -->
    <div
        bind:this={contentEl}
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

    <!-- Zoom Controls -->
    <div
        class="absolute bottom-4 right-4 flex items-center bg-white border border-black shadow-sm z-50"
    >
        <button
            class="px-3 py-1.5 hover:bg-neutral-100 border-r border-black font-mono text-sm leading-none flex items-center justify-center transition-colors"
            onclick={() => zoomCenter(0.9)}
            aria-label="Zoom Out">-</button
        >
        <button
            class="px-3 py-1.5 hover:bg-neutral-100 border-r border-black font-mono text-xs min-w-[4rem] text-center leading-none transition-colors"
            onclick={resetZoom}
            aria-label="Reset Zoom">{Math.round(scale * 100)}%</button
        >
        <button
            class="px-3 py-1.5 hover:bg-neutral-100 font-mono text-sm leading-none flex items-center justify-center transition-colors"
            onclick={() => zoomCenter(1.1)}
            aria-label="Zoom In">+</button
        >
    </div>
</div>
