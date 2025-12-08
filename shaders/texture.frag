precision mediump float;

uniform sampler2D uMainTexture;

uniform vec2 uTextureScale;
uniform vec2 uTextureOffset;

varying vec4 vColor;
varying vec2 vUV;

void main() {
    vec2 uv = vUV * uTextureScale + uTextureOffset;
    gl_FragColor = texture2D(uMainTexture, uv);
    // gl_FragColor = vec4(vUV, 0.0, 1.0);
}