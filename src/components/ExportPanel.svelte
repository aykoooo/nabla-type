<script lang="ts">
  import { store } from "$lib/store/simStore.svelte";
  import { GrayScott } from "$lib/simulation/GrayScott";
  import { contours } from "d3-contour";

  let {
    getSimulation,
    getCanvasElement,
  }: {
    getSimulation: () => GrayScott | null;
    getCanvasElement?: () => HTMLCanvasElement | null;
  } = $props();

  let exporting = $state(false);
  let exportStatus = $state("");
  let exportPadding = $state(12);
  let pngScale = $state(1);
  let pngWidth = $state(store.resolution.width);
  let pngHeight = $state(store.resolution.height);

  $effect(() => {
    store.resolution.width;
    store.resolution.height;
    pngWidth = Math.max(1, Math.round(store.resolution.width * pngScale));
    pngHeight = Math.max(1, Math.round(store.resolution.height * pngScale));
  });

  function geoToSvgPath(geometry: any): string {
    let d = "";
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        for (let i = 0; i < ring.length; i++) {
          const [x, y] = ring[i];
          d +=
            i === 0
              ? `M${x.toFixed(2)},${y.toFixed(2)}`
              : `L${x.toFixed(2)},${y.toFixed(2)}`;
        }
        d += "Z";
      }
    }
    return d;
  }

  async function exportSVG() {
    const sim = getSimulation();
    if (!sim || exporting) return;

    exporting = true;
    exportStatus = "Reading pixels…";

    try {
      const pixels = sim.readPixels();
      const width = sim.getWidth();
      const height = sim.getHeight();

      exportStatus = "Generating contours…";

      const bChannel = new Float64Array(width * height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dst = y * width + x;
          const src = ((height - 1 - y) * width + x) * 4;
          bChannel[dst] = pixels[src + 1] / 255;
        }
      }

      const contourGenerator = contours()
        .size([width, height])
        .thresholds([0.15]);
      const contourData = contourGenerator(bChannel);

      exportStatus = "Building SVG…";

      let paths = "";
      for (const c of contourData) {
        const d = geoToSvgPath(c);
        if (d) {
          paths += `<g transform="translate(${exportPadding} ${exportPadding})"><path d="${d}" fill="#000" stroke="none"/></g>`;
        }
      }

      const outW = width + exportPadding * 2;
      const outH = height + exportPadding * 2;

      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${outW} ${outH}" width="${outW}" height="${outH}">
<rect width="${outW}" height="${outH}" fill="#fff"/>
${paths}
</svg>`;

      exportStatus = "Downloading…";

      const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(svgBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rd-type-${Date.now()}.svg`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      exportStatus = "Done!";
      setTimeout(() => {
        exportStatus = "";
      }, 2000);
    } catch (err) {
      console.error("Export failed:", err);
      exportStatus = "Export failed.";
      setTimeout(() => {
        exportStatus = "";
      }, 3000);
    } finally {
      exporting = false;
    }
  }

  async function exportPNG() {
    if (exporting) return;
    exporting = true;
    exportStatus = "Generating PNG…";

    try {
      const canvas = getCanvasElement?.();
      if (!canvas) throw new Error("Canvas not found");

      // Force a render so the canvas has the latest frame with colormap applied
      const sim = getSimulation();
      if (sim) {
        sim.render(store.activeColormapId !== "blackwhite");
      }

      const outW = Math.max(1, Math.round(pngWidth));
      const outH = Math.max(1, Math.round(pngHeight));

      // If output size matches canvas, export directly
      if (outW === canvas.width && outH === canvas.height) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        if (!blob) throw new Error("toBlob returned null");
        downloadBlob(blob);
      } else {
        // Scale via OffscreenCanvas
        const outCanvas = new OffscreenCanvas(outW, outH);
        const outCtx = outCanvas.getContext("2d");
        if (!outCtx) throw new Error("Output context unavailable");
        outCtx.imageSmoothingEnabled = false;
        outCtx.drawImage(canvas, 0, 0, outW, outH);
        const blob = await outCanvas.convertToBlob({ type: "image/png" });
        downloadBlob(blob);
      }

      exportStatus = "Done!";
      setTimeout(() => {
        exportStatus = "";
      }, 2000);
    } catch (err) {
      console.error("Export failed:", err);
      exportStatus = "Export failed.";
      setTimeout(() => {
        exportStatus = "";
      }, 3000);
    } finally {
      exporting = false;
    }
  }

  function downloadBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rd-type-${Date.now()}.png`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
</script>

<div class="flex flex-col gap-3 p-3 border-t border-black">
  <h3 class="text-xs font-bold uppercase tracking-wider text-black">Export</h3>

  <p class="text-xs text-black/70">
    Canvas: {store.resolution.width}×{store.resolution.height}
  </p>

  <div class="grid grid-cols-2 gap-2 text-xs">
    <label class="flex flex-col gap-1">
      <span>Padding</span>
      <input
        type="number"
        min="0"
        max="128"
        bind:value={exportPadding}
        class="border border-black px-2 py-1"
      />
    </label>
    <label class="flex flex-col gap-1">
      <span>PNG Scale</span>
      <select
        class="border border-black px-2 py-1"
        bind:value={pngScale}
        onchange={() => {
          pngWidth = Math.max(1, Math.round(store.resolution.width * pngScale));
          pngHeight = Math.max(
            1,
            Math.round(store.resolution.height * pngScale),
          );
        }}
      >
        <option value={1}>1x</option>
        <option value={2}>2x</option>
        <option value={4}>4x</option>
      </select>
    </label>
    <label class="flex flex-col gap-1">
      <span>PNG Width</span>
      <input
        type="number"
        min="1"
        max="8192"
        bind:value={pngWidth}
        class="border border-black px-2 py-1"
      />
    </label>
    <label class="flex flex-col gap-1">
      <span>PNG Height</span>
      <input
        type="number"
        min="1"
        max="8192"
        bind:value={pngHeight}
        class="border border-black px-2 py-1"
      />
    </label>
  </div>

  <div class="flex gap-2">
    <button
      class="border border-black bg-black text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
      onclick={exportSVG}
      disabled={exporting}
    >
      SVG
    </button>
    <button
      class="border border-black bg-white text-black hover:bg-base-200 px-3 py-1.5 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
      onclick={exportPNG}
      disabled={exporting}
    >
      PNG
    </button>
  </div>
  {#if exportStatus}
    <p class="text-xs font-mono text-black/60">{exportStatus}</p>
  {/if}
</div>
