precision mediump float;

uniform sampler2D uMainTexture;
uniform vec2 uMainTextureOffset; // Offset for main texture
uniform vec2 uMainTextureScale; // Scale/Tiling for main texture

uniform sampler2D uNoiseTexture; // The first noise texture for the basic shape
uniform sampler2D uDetailNoiseTexture; // The second noise texture for detailed tearing

uniform float uTearRatio; // Controls how deep the horizontal tear goes
uniform float uDetailTearRatio; // Controls the influence of the detail noise (0.0 - 1.0)

uniform vec2 uNoiseOffset; // Random offset for noise sampling
uniform vec2 uNoiseScale; // Scale/Tiling for noise sampling

uniform vec2 uDetailNoiseOffset; // Random offset for detailed noise sampling
uniform vec2 uDetailNoiseScale; // Scale/Tiling for detailed noise sampling

uniform float uUseDetailNoise; // 0.0 = disabled, 1.0 = enabled

varying vec4 vColor;
varying vec2 vUV;

void main() {
    // --- 1. Basic Outline Shape (Low Frequency Noise) ---
    // Sample the first noise texture
    vec2 noiseUV = vUV * uNoiseScale + uNoiseOffset;
    vec4 noiseColor = texture2D(uNoiseTexture, noiseUV);
    float noiseVal = noiseColor.r; 

    // --- 2. Detailed Tearing (High Frequency Noise) ---
    // Sample the second noise texture
    vec2 detailUV = vUV * uDetailNoiseScale + uDetailNoiseOffset;
    vec4 detailColor = texture2D(uDetailNoiseTexture, detailUV);
    float detailVal = detailColor.r;

    // Combine noises
    // We can weight them. 
    // noiseVal * 0.6 + detailVal * 0.4 was the previous hardcoded mix.

    // Now we use uDetailTearRatio to control the mix.
    // If uDetailTearRatio is 0, we mostly see the base shape.
    // If uDetailTearRatio is 1, the detail noise has strong influence.

    float combinedNoise = noiseVal;
    if (uUseDetailNoise > 0.5) {
        // Mix the two noises based on the ratio.
        // Base noise always contributes (say 0.5), detail adds on top?
        // Or linear interpolation?
        // Let's try blending:
        // base weight = 1.0 - (0.5 * ratio) -> drops to 0.5 at max ratio
        // detail weight = 0.5 * ratio

        // A simpler approach:
        // combine = mix(noiseVal, detailVal, uDetailTearRatio); 
        // This might lose the base shape if ratio is high.

        // Better approach for "adding detail":
        // The base shape is the foundation. Detail adds variations.
        // combined = noiseVal * (1.0 - ratio * 0.5) + detailVal * (ratio * 0.8);

        // Let's stick to a weighted average where detail influence grows.
        // We clamp the mix factor to keep some base shape.
        float mixFactor = clamp(uDetailTearRatio, 0.0, 0.8);
        combinedNoise = mix(noiseVal, detailVal, mixFactor);
    }

    // Map UV to -1 to 1
    vec2 centeredUV = vUV * 2.0 - 1.0;

    // Map noise to a shift range centered at 0
    // Increased amplitude slightly to make the effect more visible
    float noiseShift = (combinedNoise - 0.5) * 0.5; 

    // Define the base threshold
    // 1.2 multiplier ensures full disappearance at ratio 1.0
    float thresholdX = 1.0 - uTearRatio * 1.2; 
    float thresholdY = 1.0 - uTearRatio * 1.2;

    // Apply combined noise to the threshold
    float limitX = thresholdX + noiseShift;
    float limitY = thresholdY + noiseShift;

    // Check if pixel is inside the jagged boundary
    float alphaX = step(abs(centeredUV.x), limitX);
    float alphaY = step(abs(centeredUV.y), limitY);

    float finalAlpha = alphaX * alphaY;

    // Apply offset and scale to main texture UVs
    vec2 mainTextureUV = vUV * uMainTextureScale + uMainTextureOffset;
    vec4 mainColor = texture2D(uMainTexture, mainTextureUV);

    gl_FragColor = vec4(mainColor.rgb, finalAlpha);

    // debug area
    // vec3 resultColor = mix(vec3(1.0, 0.0, 0.0), mainColor.rgb, finalAlpha);
    // gl_FragColor = vec4(resultColor, 1.0);
}
