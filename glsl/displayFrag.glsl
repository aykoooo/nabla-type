varying vec2 v_uv;
uniform sampler2D textureToDisplay;

void main() {
  vec4 pixel = texture2D(textureToDisplay, v_uv);
  float grayValue = pixel.r - pixel.g;
  float thresholded = grayValue > 0.3 ? 1.0 : 0.0;
  gl_FragColor = vec4(vec3(thresholded), 1.0);
}