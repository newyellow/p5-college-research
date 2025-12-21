precision mediump float;

uniform sampler2D uMainTexture;
uniform sampler2D uMaskTexture;

uniform vec2 uTextureScale;
uniform vec2 uTextureOffset;

// Inner shadow uniforms
uniform int uDoInnerShadow;
uniform float uInnerShadowDistance;
uniform float uInnerShadowIntensity;
uniform vec2 uMaskTextureSize;

varying vec4 vColor;
varying vec2 vUV;

float calculateInnerShadow(vec2 uv, float centerMask) {
    // Only calculate shadow if we're inside the mask
    if (centerMask < 0.1) {
        return 1.0; // No shadow outside mask
    }

    // Sample surrounding pixels to detect inner edges
    vec2 texelSize = vec2(1.0) / uMaskTextureSize;

    float shadowFactor = 0.0;
    float totalSamples = 0.0;

    // 8 directions (PI/4 increments)
    const int numDirections = 8;
    const float angleStep = 6.28318 / float(numDirections); // 2*PI / 8

    int maxDistance = int(uInnerShadowDistance);

    for (int angleIdx = 0; angleIdx < numDirections; angleIdx++) {
        float angle = float(angleIdx) * angleStep;
        vec2 direction = vec2(cos(angle), sin(angle));

        for (int dist = 1; dist <= 10; dist++) {
            if (dist > maxDistance) break;

            vec2 offset = direction * float(dist) * texelSize;
            float sampleMask = texture2D(uMaskTexture, uv + offset).r;

            // If surrounding pixel has less mask value, we're near an edge
            shadowFactor += max(0.0, centerMask - sampleMask);
            totalSamples += 1.0;
        }
    }

    // Average and normalize the shadow factor
    if (totalSamples > 0.0) {
        shadowFactor /= totalSamples;
    }
    shadowFactor = clamp(shadowFactor * uInnerShadowIntensity, 0.0, 1.0);

    // Return darkening factor (1.0 = no shadow, 0.0 = full shadow)
    return 1.0 - shadowFactor;
}

void main() {
    vec2 uv = vUV * uTextureScale + uTextureOffset;

    vec4 mainColor = texture2D(uMainTexture, uv);
    vec4 maskColor = texture2D(uMaskTexture, uv);

    vec3 finalColor = mainColor.rgb * maskColor.r;

    // Apply inner shadow effect if enabled
    if (uDoInnerShadow == 1) {
        float shadowFactor = calculateInnerShadow(uv, maskColor.r);
        finalColor *= shadowFactor;
    }

    gl_FragColor = vec4(finalColor, maskColor.r);
    // gl_FragColor = vec4(vUV, 0.0, 1.0);
}