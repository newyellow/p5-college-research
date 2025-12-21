precision mediump float;

uniform sampler2D uMainTexture;
uniform vec2 uResolution;
uniform vec2 uDirection; // (1.0, 0.0) or (0.0, 1.0)
uniform float uBlurSize;

// Control number of samples
// 0: Low (7 taps), 1: Medium (15 taps), 2: High (25 taps)
uniform int uBlurQuality; 

varying vec2 vUV;

float gaussian(float x, float sigma) {
    return exp(-(x * x) / (2.0 * sigma * sigma));
}

void main() {
    vec2 texelSize = 1.0 / uResolution;

    vec4 colorSum = vec4(0.0);
    float weightSum = 0.0;

    // Define range based on quality
    // Default (Quality 0): -3 to 3 (7 taps)
    int range = 3; 
    float sigma = 2.0; // tighter sigma for small range

    if (uBlurQuality == 1) {
        range = 7; // -7 to 7 (15 taps)
        sigma = 4.0;
    } else if (uBlurQuality >= 2) {
        range = 12; // -12 to 12 (25 taps)
        sigma = 7.0;
    }

    // Loop from -range to +range
    // In GLSL ES 1.0 / WebGL 1 loops often need constant bounds
    // but let's try a fixed max loop with a conditional break or just use the max range
    // and conditionally skip or weight 0.
    // A common workaround for WebGL 1 is just looping up to MAX and checking condition

    // Let's hardcode max iterations to cover the highest quality setting (radius 12 -> 25 iterations)
    for(int i = -12; i <= 12; i++) {
        if(abs(float(i)) > float(range)) {
            continue;
        }

        float weight = gaussian(float(i), sigma);
        float offset = float(i) * uBlurSize;

        // Optional: Jitter or spread adjustments could go here

        vec2 coords = vUV + uDirection * offset * texelSize;

        colorSum += texture2D(uMainTexture, coords) * weight;
        weightSum += weight;
    }

    gl_FragColor = colorSum / weightSum;
}
