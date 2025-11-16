precision mediump float;

uniform sampler2D uMainTexture;

varying vec2 vUV;

void main() {
  // Use UV coordinates to create a color gradient
  // vTexCoord ranges from 0.0 to 1.0

  vec4 texColor = texture2D(uMainTexture, vUV);

  // gl_FragColor = vec4(vUV.x, vUV.y, 1.0, 1.0);
  gl_FragColor = texColor;
}

