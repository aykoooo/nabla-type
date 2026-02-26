<script lang="ts">
  import { store } from "$lib/store/simStore.svelte";
  import { GrayScott } from "$lib/simulation/GrayScott";
  import { contours } from "d3-contour";

  let { getSimulation }: { getSimulation: () => GrayScott | null } = $props();

  let exporting = $state(false);
  let exportStatus = $state("");

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
      for (let i = 0; i < width * height; i++) {
        bChannel[i] = pixels[i * 4 + 1] / 255;
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
          paths += `<path d="${d}" fill="#000" stroke="none"/>`;
        }
      }

      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
<rect width="${width}" height="${height}" fill="#fff"/>
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
      const canvas = document.querySelector("canvas");
      if (!canvas) throw new Error("Canvas not found");

      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `rd-type-${Date.now()}.png`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

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
</script>

<div class="flex flex-col gap-3 p-3 border-t border-black">
  <h3 class="text-xs font-bold uppercase tracking-wider text-black">Export</h3>

  <p class="text-xs text-black/70">
    Canvas: {store.resolution.width}×{store.resolution.height}
  </p>

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
