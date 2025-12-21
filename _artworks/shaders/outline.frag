precision mediump float;

uniform sampler2D uMainTexture; // The texture to outline
uniform vec2 uResolution;    // (width, height)
uniform float uThickness;    // outline thickness in pixels
uniform vec3 uOutlineColor;  // outline color

varying vec2 vUV;

// Number of samples in the circle
const int SAMPLES = 48; 
const float PI = 3.14159265359;

void main() {
    vec2 texelSize = 1.0 / uResolution;

    vec4 centerColor = texture2D(uMainTexture, vUV);

    // If already opaque, draw original
    if(centerColor.a > 0.99) {
        gl_FragColor = vec4(centerColor.rgb, 1.0);
        return;
    }

    float maxNeighbor = 0.0;

    // Radial sampling
    // Sample points around a circle of radius uThickness
    for (int i = 0; i < SAMPLES; i++) {
        float angle = (float(i) / float(SAMPLES)) * 2.0 * PI;

        // Calculate offset: direction * thickness * pixelSize
        vec2 offset = vec2(cos(angle), sin(angle)) * uThickness * texelSize;

        float a = texture2D(uMainTexture, vUV + offset).a;
        maxNeighbor = max(maxNeighbor, a);
    }

    // Determine outline: if neighbor is opaque but center is not
    float outlineMask = clamp(maxNeighbor - centerColor.a, 0.0, 1.0);

    if(maxNeighbor > 0.0) {
        vec3 finalColor = mix(uOutlineColor, centerColor.rgb, centerColor.a);
        gl_FragColor = vec4(finalColor, 1.0);
    }
    else {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 0.0);
    }

    // gl_FragColor = vec4(uOutlineColor, outlineMask);
}
