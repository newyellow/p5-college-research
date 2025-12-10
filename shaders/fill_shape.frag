precision mediump float;

uniform vec4 uFillColor;

uniform sampler2D uMainTexture;
uniform int uUseTextureAlpha;

varying vec2 vUV;

void main() {
    // use to draw mask
    if(uUseTextureAlpha == 1) {
        vec4 textureColor = texture2D(uMainTexture, vUV);
        gl_FragColor = vec4(uFillColor.rgb, textureColor.a);
    }
    // use to just draw color
    else {
        gl_FragColor = uFillColor;
    }
}

