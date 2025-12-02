precision mediump float;

uniform sampler2D uTexture;
uniform bool uUseTexture;

varying vec4 vColor;
varying vec2 vUV;

void main() {
    if(uUseTexture) {
        gl_FragColor = texture2D(uTexture, vUV);
    }
    else {
        gl_FragColor = vec4(vUV, 1.0, 1.0);
    }
}

