<script lang="ts">
  interface Props {
    size?: number;
    coreColor?: string;
    outlineColor?: string;
    coreWidth?: number;
    outlineWidth?: number;
  }

  let {
    size = 16,
    coreColor = "stroke-red-600",
    outlineColor = "stroke-white",
    coreWidth = 2,
    outlineWidth = 4,
  }: Props = $props();

  const half = $derived(size / 2);
  // Arm length (colored core). The outline stroke cap extends beyond it.
  const start = 3;
  const end = $derived(size - 3);
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 {size} {size}"
  overflow="visible"
  class="block pointer-events-none"
>
  <!-- Outline -->
  <line
    x1={half}
    y1={start}
    x2={half}
    y2={end}
    class={outlineColor}
    style="stroke-width: {outlineWidth}px;"
    stroke-linecap="square"
    shape-rendering="crispEdges"
  />
  <line
    x1={start}
    y1={half}
    x2={end}
    y2={half}
    class={outlineColor}
    style="stroke-width: {outlineWidth}px;"
    stroke-linecap="square"
    shape-rendering="crispEdges"
  />

  <!-- Core -->
  <line
    x1={half}
    y1={start}
    x2={half}
    y2={end}
    class={coreColor}
    style="stroke-width: {coreWidth}px;"
    stroke-linecap="square"
    shape-rendering="crispEdges"
  />
  <line
    x1={start}
    y1={half}
    x2={end}
    y2={half}
    class={coreColor}
    style="stroke-width: {coreWidth}px;"
    stroke-linecap="square"
    shape-rendering="crispEdges"
  />
</svg>
