precision mediump float;

uniform sampler2D uMainTexture;     // The main image texture
uniform sampler2D uGradientTexture; // The shape map (0.0 center -> 0.5 edge -> 1.0 outside)

uniform sampler2D uCutoutNoiseTexture;
uniform sampler2D uOutlineNoiseTexture;

uniform vec2 uCutoutNoiseOffset;
uniform vec2 uOutlineNoiseOffset;

uniform float uCutoutRatio;   // 0.0 to 1.0 (0.0 = full shape, 1.0 = fully eroded)
uniform float uOutlineRatio;  // Width of the outline

uniform vec2 uCutoutNoiseScale;
uniform vec2 uOutlineNoiseScale;

// Add strength controls to make the tearing visible
uniform float uNoiseCutoutRatio; 
uniform float uNoiseOutlineRatio;

uniform vec3 uOutlineColor;
uniform float uEdgeSharpness; // 0.0 (soft) to 1.0 (sharp)

varying vec2 vUV;

void main() {
    // 1. Sample the gradient map (the shape definition)
    // 0.0 is deep inside, 0.5 is the original edge, 1.0 is far outside
    vec4 imgColor = texture2D(uMainTexture, vUV);
    vec4 gradientColor = texture2D(uGradientTexture, vUV);
    float gradientVal = texture2D(uGradientTexture, vUV).r;

    // 2. Sample Noise
    float noiseCut = texture2D(uCutoutNoiseTexture, uCutoutNoiseOffset + vUV * uCutoutNoiseScale).r;
    float noiseOut = texture2D(uOutlineNoiseTexture, uOutlineNoiseOffset + vUV * uOutlineNoiseScale).r;

    // Calculate edge softness based on sharpness parameter
    // Sharpness 1.0 -> min width 0.001
    // Sharpness 0.0 -> width 0.1
    float edgeWidth = mix(0.1, 0.001, uEdgeSharpness);

    // calculates in 0-1 range first
    float baseCutThreshold = (1.0 - uCutoutRatio);
    float cutThreshold = baseCutThreshold + (noiseCut - 0.5) * uNoiseCutoutRatio;
    cutThreshold *= 0.5; // the actual range is from 0 ~ 0.5

    float imageMaskT = smoothstep(cutThreshold - edgeWidth, cutThreshold + edgeWidth, gradientVal);

    // calculate in 0-1 range first
    float baseOutlineThreshold = uOutlineRatio;
    float outlineThreshold = baseOutlineThreshold + (noiseOut - 0.5) * uNoiseOutlineRatio;
    outlineThreshold = cutThreshold + outlineThreshold * 0.5;

    // Add a smoothstep transition for a soft edge between cutThreshold and outlineThreshold
    float smoothEdge = smoothstep(cutThreshold, cutThreshold + edgeWidth * 2.0, gradientVal);

    if (gradientVal < cutThreshold) {
        gl_FragColor = vec4(imgColor.rgb, 1.0);
    }
    else if(gradientVal < outlineThreshold) {
        // Interpolate between image color and white for a soft transition
        vec3 blendedColor = mix(imgColor.rgb, vec3(1.0), smoothEdge);
        // Make alpha also smoothly fade out towards the outline threshold
        float alpha = mix(1.0, 0.0, smoothstep(outlineThreshold - edgeWidth * 2.0, outlineThreshold, gradientVal));
        gl_FragColor = vec4(blendedColor, alpha);
    }
    else {
        // Outline color
        gl_FragColor = vec4(1.0, 1.0, 1.0, 0.0);
    }
}
