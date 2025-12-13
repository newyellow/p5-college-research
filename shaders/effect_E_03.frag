#ifdef GL_ES
precision mediump float;
#endif
#define PI 3.141592654

uniform sampler2D utexture;
uniform sampler2D uMaskTexture;
varying vec2 vTexCoord;
uniform vec2 resolution;
uniform float time;
uniform float width;
uniform float height;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

struct LensRipple {
    vec2 center;
    float maxRadius;
    float phase;
    float speed;
};

LensRipple getLensRipple(int index, float time) {
    float fi = float(index);
    
    float seedX = fi * 123.456;
    float seedY = fi * 789.012;
    
    float maxScreenRadius = sqrt(width * width + height * height) * 0.5;
    
    float moveSpeed1 = 0.15 + random(vec2(seedX, 0.0)) * 0.1; // 減慢移動速度
    float moveSpeed2 = 0.2 + random(vec2(seedY, 1.0)) * 0.1;
    
    vec2 center = vec2(
        width * (0.3 + 0.2 * sin(time * moveSpeed1 + fi * 2.0)),
        height * (0.3 + 0.2 * cos(time * moveSpeed2 + fi * 1.5))
    );
    
    float maxRadius = maxScreenRadius * (1.2 + random(vec2(fi, fi * 2.0)) * 0.3);
    
    float phase = fi * 2.0 + random(vec2(fi * 3.0, fi * 4.0)) * 3.14;
    
    float speed = 0.3 + random(vec2(fi * 5.0, fi * 6.0)) * 0.2;
    
    return LensRipple(center, maxRadius, phase, speed);
}

void main() {
    vec2 uv = vTexCoord;
    
    // 計算寬高比
    float aspectRatio = width / height;
    
    vec2 pixelPos = uv * vec2(width, height);
    vec2 totalLensOffset = vec2(0.0);
    
    // 三個漣漪 lens
    const int NUM_LENSES = 5;
    
    for (int i = 0; i < NUM_LENSES; i++) {
        LensRipple lens = getLensRipple(i, time);

        vec2 toLens = pixelPos - lens.center;
        float dist = length(toLens);
        
        if (dist < lens.maxRadius) {
            float uniformDist = sqrt(dist / lens.maxRadius); // 壓縮距離，使環間距更均勻
            
            float ripplePhase = time * lens.speed *0.1 + lens.phase;
            
            const int NUM_RINGS = 12;
            for (int ring = 1; ring <= NUM_RINGS; ring++) {
                float normalizedRing = float(ring) / float(NUM_RINGS);
                float ringRadius = normalizedRing;
                
                float expandingRadius = ringRadius + sin(ripplePhase - normalizedRing * 8.0) * 0.03;
                
                float ringWidth = 0.1 +sin(ripplePhase - normalizedRing * 6.0) * 0.02;
                
                if (abs(uniformDist - expandingRadius) < ringWidth * 0.5) {
                    float localDist = abs(uniformDist - expandingRadius);
                    float ringPct = 1.0 - (localDist / (ringWidth * 0.5));
                    
                    float rippleIntensity = sin(dist * 0.02 - ripplePhase * 2.0) * 0.5 + 0.5;
                    
                    // 0~1~0
                    float alphaWave = abs(sin(dist * 0.025 - ripplePhase * 1.5));
                    
                    float ringFactor = 1.0 - normalizedRing * 0.3;
                    
                    float lensEffect = sin(ringPct * 25.0 + dist * 0.05 - ripplePhase)* rippleIntensity* alphaWave* ringFactor * 0.025;
                    
                    vec2 lensDir = normalize(toLens);
                    vec2 lensOffset = lensDir * lensEffect * lens.maxRadius * 0.1;
                    
                    vec2 tangent = vec2(-lensDir.y, lensDir.x);
                    lensOffset += tangent * lensEffect * lens.maxRadius * 0.05 
                                 * sin(ripplePhase + float(i) * 2.0);
                    
                    totalLensOffset +=lensOffset;
                    break;
                }
            }
        }
    }
    
    vec2 distortedPixelPos = pixelPos + totalLensOffset;
    vec2 distortedUV = distortedPixelPos / vec2(width, height);

    float edgeFade = smoothstep(0.0, 0.1, distortedUV.x) * 
                 smoothstep(0.0, 0.1, distortedUV.y) *
                 smoothstep(1.0, 0.9, distortedUV.x) * 
                 smoothstep(1.0, 0.9, distortedUV.y);
        distortedUV = mix(uv, distortedUV, edgeFade);

    vec4 distortedColor = texture2D(utexture, distortedUV);
    
    vec4 maskColor = texture2D(uMaskTexture, uv);
    vec4 originalColor = texture2D(utexture, uv);
    vec3 finalColor = mix(originalColor.rgb, distortedColor.rgb, maskColor.r);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
