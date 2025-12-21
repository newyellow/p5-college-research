precision mediump float;

uniform sampler2D uMainTexture; // The original sharp image
uniform sampler2D uBlurTexture; // The blurred image
uniform sampler2D uNoiseTexture; // Noise texture for threshold variation

uniform vec3 uOutlineColor;
uniform vec2 uResolution;

// User parameters
uniform float uBaseThreshold;     // Base cutoff value
uniform float uNoiseThreshold;    // How much noise is added to the threshold
uniform float uEdgeSharpness;     // 0.0 (soft) to 1.0 (sharp)

uniform vec2 uNoiseOffset;
uniform vec2 uNoiseScale;

varying vec2 vUV;

void main() {
    vec4 original = texture2D(uMainTexture, vUV);

    // If original is already opaque, draw it
    if (original.a > 0.9) {
        gl_FragColor = original;
        return;
    }

    vec4 blurred = texture2D(uBlurTexture, vUV);

    // Sample noise
    vec2 noiseUV = vUV * uNoiseScale + uNoiseOffset;
    float noiseVal = texture2D(uNoiseTexture, noiseUV).r;

    // Calculate dynamic threshold
    // effectiveThreshold = base + noise * impact
    float effectiveThreshold = uBaseThreshold + noiseVal * uNoiseThreshold;

    effectiveThreshold = (1.0 - effectiveThreshold) * 0.6;
    // Calculate smoothing width based on sharpness
    // Sharpness 1.0 -> width 0.001 (very sharp)
    // Sharpness 0.0 -> width 0.1 (soft)
    float width = mix(0.1, 0.001, uEdgeSharpness);

    float outlineAlpha = smoothstep(effectiveThreshold - width, effectiveThreshold + width, blurred.a);
    gl_FragColor = vec4(uOutlineColor, outlineAlpha);
}
