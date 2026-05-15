precision highp float;

uniform sampler2D u_state;
uniform vec2 u_pixelSize;
uniform float u_feed;
uniform float u_kill;
uniform float u_da;
uniform float u_db;
uniform float u_dt;
uniform sampler2D u_feedMap;
uniform sampler2D u_killMap;
uniform bool u_useParamMaps;

varying vec2 uv;

void main() {
  vec2 px = u_pixelSize;

  // Sample 3x3 neighborhood
  vec4 center = texture2D(u_state, uv);
  vec4 n      = texture2D(u_state, uv + vec2( 0.0,  px.y));
  vec4 s      = texture2D(u_state, uv + vec2( 0.0, -px.y));
  vec4 e      = texture2D(u_state, uv + vec2( px.x,  0.0));
  vec4 w      = texture2D(u_state, uv + vec2(-px.x,  0.0));
  vec4 ne     = texture2D(u_state, uv + vec2( px.x,  px.y));
  vec4 nw     = texture2D(u_state, uv + vec2(-px.x,  px.y));
  vec4 se     = texture2D(u_state, uv + vec2( px.x, -px.y));
  vec4 sw     = texture2D(u_state, uv + vec2(-px.x, -px.y));

  float A = center.r;
  float B = center.g;

  // Laplacian with 3x3 kernel (weights chosen to allow dt=1 with da=1, db=0.5)
  float lapA = -1.0 * A
    + 0.2 * (n.r + s.r + e.r + w.r)
    + 0.05 * (ne.r + nw.r + se.r + sw.r);
  float lapB = -1.0 * B
    + 0.2 * (n.g + s.g + e.g + w.g)
    + 0.05 * (ne.g + nw.g + se.g + sw.g);

  // Param maps or uniform
  float f = u_useParamMaps
    ? texture2D(u_feedMap, uv).r
    : u_feed;
  float k = u_useParamMaps
    ? texture2D(u_killMap, uv).r
    : u_kill;

  float reaction = A * B * B;

  float dA = (u_da * lapA - reaction + f * (1.0 - A)) * u_dt;
  float dB = (u_db * lapB + reaction - (k + f) * B) * u_dt;

  float newA = clamp(A + dA, 0.0, 1.0);
  float newB = clamp(B + dB, 0.0, 1.0);

  gl_FragColor = vec4(newA, newB, 0.0, 1.0);
}
