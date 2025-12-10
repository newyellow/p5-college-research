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

uniform bool flipV;

uniform vec3 customPalette[12];

float getLuminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 getPaletteColor(int index) {
    if (index == 0) return vec3(0.0, 0.0, 0.2+abs(sin(time)));      // 深藍（最冷）
    if (index == 1) return vec3(0.0, 0.3+abs(sin(time)), 0.8);      // 藍
    if (index == 2) return vec3(0.0, 0.8, 0.9);      // 青
    if (index == 3) return vec3(0.0+abs(sin(time)), 0.9, 0.3);      // 綠
    if (index == 4) return vec3(0.8, 0.9, 0.0);      // 黃
    if (index == 5) return vec3(1.0, 0.5+abs(sin(time)), 0.0);      // 橙
    if (index == 6) return vec3(1.0+abs(sin(time)), 0.1, 0.0);      // 紅
    return vec3((sin(time*1.1))*0.5+0.5,(sin(time*1.2))*0.5+0.5,(sin(time*1.3))*0.5+0.5);                       // 白（最熱）
}

vec3 customColorMap(float t) {
    t = clamp(t, 0.0, 1.0);

    float scaledT = t * 11.0;
    int index = int(floor(scaledT));
    float localT = fract(scaledT);

    if (index < 0) index = 0;
    if (index > 10) index = 10;

    vec3 color1 = getPaletteColor(index);
    vec3 color2 = getPaletteColor(index + 1);

    return mix(color1, color2, localT);
}

vec3 warpColor(in vec2 uv, float t) {
    float strength = 0.1;
    vec2 pos = uv * 2.0;

    for(int i = 1; i < 8; i++) {
        pos.x += strength * sin(10.0 * t + float(i) * 0.5 * pos.y);
        pos.y += strength * cos(10.0 * t + float(i) * 0.5 * pos.x);
    }

    vec3 col = 0.5 + 0.5 * cos(t + pos.xyx + vec3(1, 2, 5));
    return col;
}

float smoothCurve(float x) {
    return sin(x * PI);
}

float map(float value, float min1, float max1, float min2, float max2) {
    float pct = (value - min1) / (max1 - min1);
    float result = min2 + (max2-min2)*pct;
    return result;
}

float mapc(float value, float min1, float max1, float min2, float max2) {    
    float value2 = clamp(value, min1, max1);
    return map(value2, min1, max1, min2, max2);
}

float random (vec2 st) {
    return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*437580.5453123);
}

void main() {
    vec2 uv = vTexCoord;
    uv.y = 1.0 - uv.y;
    
    vec2 pos = uv * vec2(width, height);
    vec2 center = vec2(width/2., height/2.);
    vec2 distortedPos = pos;
    
    distortedPos.x += sin(distortedPos.y*0.1 + time*0.01) * 0.02;
    distortedPos.y += sin(distortedPos.x*0.1 + time*0.01) * 0.02;
    
    // lens
    for (int i = 0; i < 5; i++){
        float ii = float(i);
        
        float angle = ii * 2.0 + time * 0.03;
        float radius = width * 0.3 * (0.5 + sin(time * 0.02 + ii) * 0.5);
        vec2 lensCenter = center + vec2(cos(angle), sin(angle)) * radius;
        
        float lensSize = width * 0.15 * (0.8 + sin(ii + time*0.01) * 0.2);
        float pct;
        bool inLens = false;
        
        float sparkle = 0.9 + random(uv*0.5) * 0.1;
        vec2 diff = abs(distortedPos - lensCenter) * 0.4 * sparkle;
        
        float maxDist = max(diff.x, diff.y);
        if (maxDist < lensSize) {
            pct = 1.0 - (maxDist / lensSize);
            inLens = true;
        }
        
        if (inLens) {
            vec2 diff = normalize(distortedPos - lensCenter);
            float distCenter = distance(distortedPos, lensCenter);
            distortedPos = lensCenter + diff * distCenter * mapc(sin(pct*100.)-1., -1., 0.5, 1., 1.05); 
        }
    }
    
    vec2 distortedUV = distortedPos / vec2(width, height);
    vec4 texColor = texture2D(utexture, distortedUV);
    

    if(flipV) {
        uv.y = 1.0 - uv.y;
    }

    vec4 texColor = texture2D(utexture, uv);

    float cycleDuration = 5.0;
    float cyclePhase = mod(time, cycleDuration) / cycleDuration;

    float wavePosition = cyclePhase;
    float waveWidth = 0.4;

    float distToWave = abs(uv.x - wavePosition);
    float spatialMask = 1.0 - smoothstep(0.0, waveWidth, distToWave);
    //timecurve
    float timeMask = smoothCurve(cyclePhase);

    float mixFactor = spatialMask * timeMask;

    float luminance = getLuminance(texColor.rgb);

    float breathCycle = sin(time * 2.0) * 0.5 + 0.5;
    float spatialVar = sin(time * 3.0 + uv.x * PI * 4.0) * 0.5 + 0.5;
    
    vec3 warp = warpColor(uv, time * 0.05);
    
    float colorValue = luminance 
    + breathCycle * 0.5 * mixFactor
    + spatialVar * 0.4 * mixFactor
    ;
    colorValue = clamp(colorValue, 0.0, 1.0);
    
    vec3 mappedColor = mix(texColor.rgb, (customColorMap(colorValue)+warp)*0.5, 0.6);
    vec4 maskColor = texture2D(uMaskTexture, uv);
    
    vec4 originalColor = texture2D(utexture, uv);
    
    vec3 finalColor = mix(originalColor.rgb, mappedColor, maskColor.r);
    
    gl_FragColor = vec4(finalColor, texColor.a);
}

