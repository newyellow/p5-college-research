precision mediump float;

uniform sampler2D uMainTexture;

varying vec4 vColor;
varying vec2 vUV;

void main() {
    gl_FragColor = texture2D(uMainTexture, vUV);
    // gl_FragColor = vec4(vUV, 0.0, 1.0);
}