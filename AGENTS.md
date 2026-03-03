# agents.md — Reaction-Diffusion Typography Tool

## What This Project Is
A static web app that grows organic typographic forms using a Gray-Scott
reaction-diffusion simulation. The user types text, the glyph shape seeds the
GPU simulation, and the resulting pattern can be exported as SVG or PNG.

Pipeline:
  Font glyph (vector) → Canvas 2D raster mask → WebGL GPU simulation
  → Canvas display → SVG/PNG export

---

## Non-Trivial Architecture Decisions

### 1. WebGL1 Only (No WebGL2 / WebGPU)
WebGL1 is used with `OES_texture_float` extension for maximum browser
compatibility. The Gray-Scott compute step is implemented as a **fragment
shader** rendering to a framebuffer — the standard GPGPU pattern.

### 2. Ping-Pong Framebuffers
Two float RGBA framebuffers (`pingFBO`, `pongFBO`) are swapped each step.
The simulation reads from one and writes to the other. **Never copy texture
data between them** — only swap JS references.

Float texture extension priority:
  1. `OES_texture_float` + `OES_texture_float_linear`
  2. Fallback: `OES_texture_half_float`
  3. Surface an error to UI if neither exists

### 3. Simulation State Encoding
State is packed into RGBA float texture channels:
  - R channel = chemical A
  - G channel = chemical B
  - B, A channels = reserved (param maps may use these later)

Seed mapping (from Canvas 2D pixel mask):
  - Black pixel (glyph area)  → A=0.50, B=0.25
  - White pixel (background)  → A=1.00, B=0.00

### 4. Colormap System (LUT-Based)
Colormaps are 256×1 RGBA textures uploaded to GPU once.
The display shader samples this LUT using the B channel value as the U
coordinate. Adding a new colormap = implementing the `Colormap` interface and
calling `registry.register()`. No shader changes required.

The `blackwhite` mode bypasses the LUT entirely (a `step(0.5, b)` in GLSL)
and is toggled via a `u_useLUT` uniform boolean.

### 5. Centralized Controller (`simController.ts`)
All simulation actions (pause, play, undo, reseed, resize, save, replay
navigation) are routed through a singleton `SimController` class. Components
import `simController` directly rather than receiving callback props.
The controller holds a `canvasRef` (set by `SimCanvas.onMount`) which exposes
methods like `reseed()`, `capturePauseSnapshot()`, `resizeSimulation()`, etc.

### 6. Decoupled Simulation Loop (`SimLoopManager.ts`)
The `requestAnimationFrame` loop, FPS tracking, sim-step timing, and replay
frame capture are extracted into `SimLoopManager`. `SimCanvas.svelte` creates
a `SimLoopManager` instance, calls `start(sim)` on mount and `stop()` on
destroy. The component itself only manages the `<canvas>` element, WebGL
bootstrap, colormap uploads, and seed injection.

### 7. State Management (Svelte 5 Stores)
- **`simStore.svelte.ts`** — global `$state` object holding params, resolution,
  colormap selection, seed text/font, iteration count, pause snapshots, etc.
- **`replayStore.svelte.ts`** — ring buffer of `ReplayFrame` objects with
  cursor, configurable `maxFramesBack`, and `captureFps`.
- Components import stores directly (no prop drilling). `$derived` is preferred
  over `$effect` for computed values (e.g. preset names, pause markers).

### 8. Multi-Step Undo System
`simStore` maintains a stack of `PauseSnapshot` objects (up to 50). Each
snapshot captures the full simulation state, params, colormap, seed, and
resolution. Undo pops the stack and restores everything. The undo stack is
cleared on reseed or clear.

### 9. Custom Timeline Track (`BottomTimelineBar`)
The replay slider is a custom-drawn track (not `<input type="range">`):
- **Buffer fill bar** — width = `frames.length / maxFramesBack`, shows buffer
  occupancy.
- **Pause markers** — vertical lines at frame indices matching pause iterations.
- **Draggable cursor** — click/drag to scrub. Frame counter shows
  `frames / maxFramesBack` with a clickable denominator to change window size.

### 10. Param Map Shader Stubs
The simulation shader already accepts `u_feedMap`, `u_killMap`, and
`u_useParamMaps` uniforms. In v1, these are 1×1 placeholder textures and the
boolean is false. Spatially-varying feed/kill maps can be added with **zero
shader changes**.

### 11. Parameter Updates Without Loop Restart
Feed/kill/diffusion parameters are passed as regl uniforms every frame.
Changing a parameter does NOT restart or reinitialize the simulation — the
running state is preserved.

### 12. Steps Per Frame
The simulation runs N steps per `requestAnimationFrame` (default 8, range
1–16). Each step is a full GPU draw call inside `GrayScott.step()`.

---

## Key Interfaces

```ts
interface SimParams {
  feed: number; kill: number
  da: number; db: number
  dt: number; stepsPerFrame: number
}

interface Colormap {
  id: string; label: string
  buildLUT(): Uint8Array  // 256×4 RGBA
}

interface SimCanvasRef {
  reseed(): void
  reseedWithFont(font: any): void
  getCanvasElement(): HTMLCanvasElement | null
  getSimulation(): GrayScott | null
  capturePauseSnapshot(): void
  restorePauseSnapshot(): void
  restoreReplayCursorFrame(): void
  clearSimulation(): void
  getActiveBoundsSize(): { width: number; height: number } | null
  resizeSimulation(w: number, h: number): void
}
```

---

## Component Structure

```
App.svelte                 — Layout shell, keyboard shortcuts → simController
├── TopControlBar          — Resolution, aspect, FPS (uses store directly)
├── LeftToolbar            — Play/pause, undo, save, min/max, reseed, clear
├── SimCanvas              — <canvas>, GrayScott init, colormap, SimLoopManager
├── BottomTimelineBar      — Custom timeline track, playback controls
├── ParameterPanel         — Feed/kill/D sliders, preset picker, Pearson map
├── SeedPanel              — Text input, font upload, font size
├── ColormapPicker         — Gradient editor, preset colormaps
└── ExportPanel            — SVG/PNG export with scale/padding controls
```

---

## What Is Intentionally Deferred

- Google Fonts integration — post-MVP
- Painted param maps (PaintLayer) — post-MVP, shader stubs already present
- Multiple text layers — post-MVP
- Animation/GIF export — post-MVP