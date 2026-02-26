# agents.md — Reaction-Diffusion Typography Tool

## What This Project Is
A static web app that grows organic typographic forms using a Gray-Scott
reaction-diffusion simulation. The user types text, the glyph shape seeds the
GPU simulation, and the resulting pattern can be exported as an SVG.

Pipeline:
  Font glyph (vector) → Canvas 2D raster mask → WebGL2 GPU simulation
  → Canvas display → VTracer SVG export

---

## Non-Trivial Architecture Decisions

### 1. WebGL2 Only (No WebGPU)
WebGPU is excluded for Firefox compatibility. The Gray-Scott compute step is
implemented as a **fragment shader** that renders to a framebuffer — not a true
compute shader. This is the standard GPGPU pattern in WebGL2.

### 2. Ping-Pong Framebuffers
Two float RGBA framebuffers (`pingFBO`, `pongFBO`) are swapped each step.
The simulation reads from one and writes to the other. **Never copy texture
data between them** — only swap JS references. This is the only correct way to
do iterative GPU simulation in WebGL2.

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

### 5. Param Map Shader Stubs
The simulation shader already accepts `u_feedMap`, `u_killMap`, and
`u_useParamMaps` uniforms. In v1, these are 1×1 placeholder textures and the
boolean is false. This means spatially-varying feed/kill maps can be added by
a future `PaintLayer` component with **zero shader changes**.

### 6. SVG Export in a Web Worker
VTracer WASM is heavy (~200 KB binary) and blocks the main thread during
tracing. It is imported and executed exclusively inside `svgWorker.ts`.
The main thread sends a thresholded pixel buffer, the worker returns an SVG
string. `readPixels()` is only called at export time, never in the render loop.

### 7. Parameter Updates Without Loop Restart
Feed/kill/diffusion parameters are passed as regl uniforms every frame.
Changing a parameter does NOT restart or reinitialize the simulation — the
running state is preserved. The Svelte store holds the values; the regl draw
call reads them each frame via `regl.prop()`.

### 8. Steps Per Frame
The simulation runs N steps per `requestAnimationFrame` (default 8, range
1–32). This is a uniform, not a loop in JS — each step is a full GPU draw
call. Higher values converge the pattern faster at the cost of GPU time per
frame.

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
```

---

## What Is Intentionally Deferred

- Font upload (opentype.js) — Phase 6
- Google Fonts integration — post-MVP
- Painted param maps (PaintLayer) — post-MVP, shader stubs already present
- Multiple text layers — post-MVP
- Animation/GIF export — post-MVP