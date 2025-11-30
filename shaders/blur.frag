precision mediump float;

uniform sampler2D uMainTexture;
uniform vec2 uResolution;
uniform vec2 uDirection; // (1.0, 0.0) or (0.0, 1.0)
uniform float uBlurSize;

varying vec2 vUV;

void main() {
    vec2 texelSize = 1.0 / uResolution;

    // Radius 3 Gaussian-ish weights (7 taps)
    // Weights: 0.06, 0.12, 0.20, 0.24, 0.20, 0.12, 0.06 (approx sum 1.0)
    // Normalized exactly:
    // Center: 0.227027 (weight 4)
    // 1: 0.1945946 (weight 3)
    // 2: 0.1216216 (weight 2)
    // 3: 0.054054 (weight 1) -- slightly higher than standard for smoother falloff
    // Let's use pre-calculated weights for speed and "ish" feel

    float weights[7];
    weights[0] = 0.05;
    weights[1] = 0.11;
    weights[2] = 0.21;
    weights[3] = 0.26; // Center
    weights[4] = 0.21;
    weights[5] = 0.11;
    weights[6] = 0.05;

    vec4 colorSum = vec4(0.0);
    float weightSum = 0.0;

    for(int i = 0; i < 7; i++) {
        float offset = float(i - 3) * uBlurSize;
        vec2 coords = vUV + uDirection * offset * texelSize;

        // Manual weights array access
        float w = weights[i];

        colorSum += texture2D(uMainTexture, coords) * w;
        weightSum += w;
    }

    gl_FragColor = colorSum / weightSum;
}
