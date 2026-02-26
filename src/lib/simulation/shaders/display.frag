precision highp float;

uniform sampler2D u_state;
uniform sampler2D u_colormap;
uniform bool u_useLUT;

varying vec2 uv;

void main() {
  float b = texture2D(u_state, uv).g;

  vec3 color;
  if (u_useLUT) {
    color = texture2D(u_colormap, vec2(b, 0.5)).rgb;
  } else {
    // Black-and-white: B < 0.5 → white, B >= 0.5 → black
    float bw = 1.0 - step(0.5, b);
    color = vec3(bw);
  }

  gl_FragColor = vec4(color, 1.0);
}
