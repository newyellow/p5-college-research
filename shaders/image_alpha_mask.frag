precision mediump float;

uniform sampler2D uMainTexture;
uniform sampler2D uAlphaTexture;

varying vec4 vColor;
varying vec2 vUV;

void main() {
    vec4 color = texture2D(uMainTexture, vUV);
    vec4 alphaColor = texture2D(uAlphaTexture, vUV);
    float finalAlpha = color.a * alphaColor.r;

    color *= alphaColor.r;

    // gl_FragColor = vec4(color.rgb, finalAlpha);
    gl_FragColor = vec4(color.rgb, alphaColor.r);
}