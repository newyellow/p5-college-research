precision mediump float;

varying vec2 vTexCoord;

uniform float time;
uniform float width;
uniform float height;
uniform sampler2D colorTex;
uniform sampler2D utexture;      
uniform sampler2D uMaskTexture;  

float map(float value, float min1, float max1, float min2, float max2) {
    float pct = (value - min1) / (max1 - min1);
    float result = min2 + (max2 - min2) * pct;
    return result;
}

float mapClamped(float value, float min1, float max1, float min2, float max2) {    
    float clampedValue = clamp(value, min1, max1);
    return map(clampedValue, min1, max1, min2, max2);
}

const float PI = 3.1415926535897932384626433832795;

float atan2(in float y, in float x) {
    return x == 0.0 ? sign(y) * PI / 2.0 : atan(y, x);
}


vec4 permute(vec4 x) {
    return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) { 
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

    i = mod(i, 289.0); 
    vec4 p = permute(permute(permute( 
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0)) 
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 1.0 / 7.0;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float noise3D(float x, float y, float z) {
    return snoise(vec3(x, y, z));
}

float noise2D(float x, float y) {
    return snoise(vec3(x, y, 0.0));
}

mat2 rotate2D(float angle) {
    return mat2(cos(angle), -sin(angle),
                sin(angle), cos(angle));
}

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

//random color
vec3 generateBlockColor(vec2 blockId, float time) {
    float r = random(blockId);
    float g = random(blockId + vec2(1.0, 0.0));
    float b = random(blockId + vec2(0.0, 1.0));
    
    float pulse = sin(time * 2.0 + r * 10.0) * 0.5 + 0.5;
    
    vec3 color1 = vec3(0.9, 0.3, 0.5);
    vec3 color2 = vec3(0.2, 0.8, 0.9);
    vec3 color3 = vec3(0.9, 0.7, 0.2);
    vec3 color4 = vec3(0.5, 0.2, 0.9);
    
    vec3 baseColor;
    if (r < 0.25) {
        baseColor = color1;
    } else if (r < 0.5) {
        baseColor = color2;
    } else if (r < 0.75) {
        baseColor = color3;
    } else {
        baseColor = color4;
    }
    
    return baseColor * (0.7 + pulse * 0.3);
}

#define NUM_WAVE_POINTS 3

vec2 getWavePoint(float index) {
    float angle = (index / float(NUM_WAVE_POINTS)) * 6.28318 + time * 0.002;
    float radius = 0.5 + 0.1 * sin(time * 0.5 + index);
    return vec2(
        radius * cos(angle),
        radius * sin(angle)
    );
}

float getWaveInfluence(vec2 st, vec2 wavePoint) {
    float dist = length(st - wavePoint);
    float amplitude = 0.1 * exp(-2.0 * dist);
    return amplitude * sin(dist * 10.0 - time * 0.005);
}


void main() {
    vec2 uv = vTexCoord;
    vec2 pixelPos = uv * vec2(width, height);
    vec2 originalPixelPos = pixelPos;
    vec2 center = vec2(width / 2.0, height / 2.0);

    float totalDisplacement = 10.5;
    for(int i = 0; i < NUM_WAVE_POINTS; i++) {
        vec2 wavePoint = getWavePoint(float(i));
        totalDisplacement += getWaveInfluence(uv, wavePoint);
    }

    float angle = atan(uv.y * 2.0, float(uv.x * 10.0));
    float radius = length(uv);
    radius += totalDisplacement;

    float animationScale = mix(0.0, 10.0, sin(time) * 0.05 + 0.5);

    vec3 baseColor = texture2D(utexture, vTexCoord).rgb;
    
    vec2 glitchOffset = vec2(0.0);
    float glitchStrength = 0.0;
    
    vec2 finalBlockId = vec2(0.0);
    bool shouldColorBlock = false;
    
    for (int i = 0; i < 10; i++) {
        float layerIndex = float(i);
        int layerMod = int(mod(layerIndex, 10.0));
        
        vec2 animatedPos = vec2(uv * animationScale + time * 0.05);
        
        float distanceToAnimatedPos = distance(pixelPos, animatedPos);
        
        pixelPos = originalPixelPos;
        
        float glitchIntensity = 0.05;
        float amplitudeMultiplier = map(sin(layerIndex * 0.01), -1.0, 1.0, 0.0, 1.0);
        if (layerMod == 0) amplitudeMultiplier *= 1.0 * animationScale;
        
        float verticalNoiseScale = noise2D(
            time * 0.1 + floor(layerIndex + pixelPos.y * 50.0 + sin(pixelPos.x * 5.0 * sin(time * 0.0001))) * 10.0, 
            10.0
        ) * amplitudeMultiplier + amplitudeMultiplier;
        
        float horizontalNoiseScale = noise2D(
            floor(layerIndex + pixelPos.y * verticalNoiseScale) * 0.01, 
            0.0
        ) * amplitudeMultiplier + amplitudeMultiplier * radius;
        
        verticalNoiseScale /= 10.0 * (10.0 + 100.0 * glitchIntensity);
        horizontalNoiseScale /= 10.0 * (10.0 + 100.0 * glitchIntensity);
        
        float horizontalStep = 10.0 / horizontalNoiseScale + 20.0 * sin(layerIndex * 0.123 + layerIndex);
        float verticalStep = 10.0 / verticalNoiseScale + 30.0 * sin(layerIndex * 0.123 + layerIndex);
        
        vec2 mixedPixelPos = mix(pixelPos, originalPixelPos + animatedPos, sin(layerIndex) * 0.05 + 0.5);

        vec2 gridCoord = vec2(
            floor(originalPixelPos.x * horizontalNoiseScale) * 0.5, 
            floor(originalPixelPos.y * verticalNoiseScale) * 0.5
        );
        
        vec2 gridCoordMixed = vec2(
            floor(mixedPixelPos.x * horizontalNoiseScale), 
            floor(mixedPixelPos.y * verticalNoiseScale)
        );
        
        float noiseDistortion = noise2D(gridCoord.x * 1.5, gridCoord.y * 1.1);
        gridCoordMixed += vec2(horizontalStep * 0.5, verticalStep * 0.5) * glitchIntensity;
        
        if (i == 1) {
            finalBlockId = gridCoordMixed;
        }
        
        pixelPos -= gridCoordMixed;
        pixelPos *= (0.1 + noiseDistortion * 20.0 * sin(10.0 * gridCoord * sin(noiseDistortion * 3.0 + 2.0) * 10.1 * 3.14));
        
        float blendFactor = sin(distanceToAnimatedPos * 0.001 + layerIndex * 0.5) * 0.4 + 0.6;
        pixelPos = blendFactor * pixelPos + (1.0 - blendFactor) * originalPixelPos;
        
        vec2 offset = (pixelPos - originalPixelPos) / vec2(width, height);
        
        float distToCenter = distance(pixelPos, center);
        float strength = 1.0 / (1.0 + distToCenter * 0.001);
        
        glitchOffset += offset * strength * 0.01;
        glitchStrength += strength;
    }

    vec2 glitchedUV = vTexCoord + glitchOffset;
    glitchedUV = fract(glitchedUV);
    
    float blockRandom = random(finalBlockId + floor(time * 0.5));
    shouldColorBlock = blockRandom < 0.05;
    
    vec3 finalColor;
    
    if (shouldColorBlock) {
        // color function
        finalColor = generateBlockColor(finalBlockId, time);
    } else {
        // 2d texture
        finalColor = texture2D(utexture, glitchedUV).rgb;
    }
    
    vec4 maskColor = texture2D(uMaskTexture, vTexCoord);
    finalColor = mix(baseColor, finalColor, maskColor.r);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
