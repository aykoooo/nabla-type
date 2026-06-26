precision highp float;

uniform sampler2D u_state;
uniform sampler2D u_colormap;

varying vec2 uv;

// B peaks at ~0.55 in the Karl-Sims f/k window. Normalize to [0,1] so the
// full 256-entry LUT range is used. Keep in sync with B_MAX_KARL_SIMS in
// src/lib/warp/karlSimsWarp.ts.
#define B_MAX_KARL_SIMS 0.55

void main() {
  float b = texture2D(u_state, uv).g;
  float t = clamp(b / B_MAX_KARL_SIMS, 0.0, 1.0);
  vec3 color = texture2D(u_colormap, vec2(t, 0.5)).rgb;
  gl_FragColor = vec4(color, 1.0);
}
