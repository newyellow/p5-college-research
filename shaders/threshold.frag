precision mediump float;

uniform sampler2D uMainTexture; // The original sharp image
uniform sampler2D uBlurTexture; // The blurred image
uniform vec3 uOutlineColor;
uniform float uThreshold; // Cutoff for outline (e.g. 0.1)

varying vec2 vUV;

void main() {
    vec4 original = texture2D(uMainTexture, vUV);
    vec4 blurred = texture2D(uBlurTexture, vUV);

    // If original is already opaque, draw it
    if (original.a > 0.9) {
        gl_FragColor = original;
        return;
    }

    // Otherwise, check blurred alpha
    // If blurred alpha > threshold, it's part of the outline
    // uThreshold controls thickness somewhat inversely (lower threshold = fatter outline)

    float outlineAlpha = smoothstep(uThreshold - 0.05, uThreshold + 0.05, blurred.a);

    gl_FragColor = vec4(uOutlineColor, outlineAlpha);
}

