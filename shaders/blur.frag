precision mediump float;

uniform sampler2D uMainTexture;
uniform vec2 uResolution;
uniform vec2 uDirection; // (1.0, 0.0) or (0.0, 1.0)
uniform float uBlurSize;

varying vec2 vUV;

// Function to calculate Gaussian weight
float gaussian(float x, float sigma) {
    return exp(-(x * x) / (2.0 * sigma * sigma)) / (2.50662827463 * sigma);
}

void main() {
    vec2 texelSize = 1.0 / uResolution;

    vec4 colorSum = vec4(0.0);
    float weightSum = 0.0;

    // 17-tap Gaussian blur (Radius 8, 1 center, total 17 samples)
    // Loop from -8 to +8
    // Sigma should be roughly radius / 2 or radius / 3
    // For radius 8, sigma = 3.0 or 4.0 is good for smoothness
    float sigma = 4.0;

    for(int i = -8; i <= 8; i++) {
        float weight = gaussian(float(i), sigma);
        float offset = float(i) * uBlurSize;
        vec2 coords = vUV + uDirection * offset * texelSize;

        colorSum += texture2D(uMainTexture, coords) * weight;
        weightSum += weight;
    }

    // Normalize
    gl_FragColor = colorSum / weightSum;
}
