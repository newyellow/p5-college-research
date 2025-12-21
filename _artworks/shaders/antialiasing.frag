precision mediump float;

uniform sampler2D uMainTexture;
uniform vec2 uTextureSize;
uniform float uStrength; // Blur strength (default 1.0)
uniform float uStepSize; // Distance of neighbor sampling (default 1.0)

varying vec2 vUV;

void main() {
    // Simple Gaussian-like Blur for anti-aliasing on edges
    vec2 onePixel = vec2(1.0, 1.0) / uTextureSize * uStepSize;
    
    vec4 center = texture2D(uMainTexture, vUV);
    
    // Check if we are on an edge where smoothing is needed
    // We only want to smooth semi-transparent pixels or pixels near transparency
    // If fully opaque, skip (unless neighbor is transparent, but that's hard to check cheaply without sampling)
    // If fully transparent, skip
    if (center.a >= 0.95 || center.a <= 0.06) {
        // Optional: Perform a cheap neighbor check to see if we are on the boundary
        // This helps smooth the "jaggies" on the opaque side of the edge
        // But for now, let's stick to the user's previous logic of respecting alpha
        gl_FragColor = center;
        return;
    }

    // 3x3 Gaussian Kernel
    // 1 2 1
    // 2 4 2
    // 1 2 1
    
    vec4 colorSum = vec4(0.0);
    float weightSum = 0.0;
    
    // Sample 3x3 grid
    for(int x = -1; x <= 1; x++) {
        for(int y = -1; y <= 1; y++) {
            vec2 offset = vec2(float(x), float(y)) * onePixel;
            vec4 sample = texture2D(uMainTexture, vUV + offset);
            
            // Gaussian weights
            float weight = 1.0;
            if (x == 0 && y == 0) weight = 4.0;
            else if (x == 0 || y == 0) weight = 2.0;
            else weight = 1.0;
            
            colorSum += sample * weight;
            weightSum += weight;
        }
    }
    
    vec4 blurred = colorSum / weightSum;
    
    // Mix based on strength
    gl_FragColor = mix(center, blurred, uStrength);
}
