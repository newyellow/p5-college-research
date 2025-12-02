precision mediump float;

varying vec4 vColor;
varying vec2 vUV;

void main() {
    gl_FragColor = vec4(vUV.y, vUV.y, vUV.y, 1.0);
}