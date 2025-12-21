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
uniform float uEffectStrength;

uniform vec3 customPalette[12];

float getLuminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 getPaletteColor0(int index) {
    if (index == 0) return vec3(0.0, 0.0, 0.2+abs(sin(time)));
    if (index == 1) return vec3(0.0, 0.3+abs(sin(time)), 0.8);
    if (index == 2) return vec3(0.0, 0.8, 0.9);
    if (index == 3) return vec3(0.0+abs(sin(time)), 0.9, 0.3);
    if (index == 4) return vec3(0.8, 0.9, 0.0);
    if (index == 5) return vec3(1.0, 0.5+abs(sin(time)), 0.0);
    if (index == 6) return vec3(1.0+abs(sin(time)), 0.1, 0.0);
    return vec3((sin(time*1.1))*0.5+0.5,(sin(time*1.2))*0.5+0.5,(sin(time*1.3))*0.5+0.5);
}

// Land)
vec3 getPaletteColor1(int index) {
    if (index == 0) return vec3(0.3, 0.1, 0.05+abs(sin(time))*0.05);
    if (index == 1) return vec3(0.45, 0.2+abs(sin(time))*0.1, 0.1);
    if (index == 2) return vec3(0.55, 0.35, 0.15);
    if (index == 3) return vec3(0.45+abs(sin(time))*0.1, 0.5, 0.2);
    if (index == 4) return vec3(0.65, 0.6, 0.25);
    if (index == 5) return vec3(0.8, 0.65+abs(sin(time))*0.1, 0.3);
    if (index == 6) return vec3(0.85+abs(sin(time))*0.1, 0.75, 0.4);
    return vec3((sin(time*1.1))*0.15+0.85,(sin(time*1.2))*0.15+0.75,(sin(time*1.3))*0.15+0.5);
}

// Sea
vec3 getPaletteColor2(int index) {
    if (index == 0) return vec3(0.2, 0.05, 0.15+abs(sin(time))*0.1);
    if (index == 1) return vec3(0.3, 0.15+abs(sin(time))*0.1, 0.35);
    if (index == 2) return vec3(0.2, 0.3, 0.5);
    if (index == 3) return vec3(0.0+abs(sin(time))*0.1, 0.5, 0.65);
    if (index == 4) return vec3(0.1, 0.65, 0.75);
    if (index == 5) return vec3(0.3, 0.75+abs(sin(time))*0.1, 0.85);
    if (index == 6) return vec3(0.5+abs(sin(time))*0.1, 0.85, 0.95);
    return vec3((sin(time*1.1))*0.2+0.7,(sin(time*1.2))*0.15+0.9,(sin(time*1.3))*0.05+0.95);
}

// Mountain
vec3 getPaletteColor3(int index) {
    if (index == 0) return vec3(0., 0.1, 0.05+abs(sin(time))*0.05);
    if (index == 1) return vec3(0., 0.2+abs(sin(time))*0.1, 0.1);
    if (index == 2) return vec3(0., 0.35, 0.15);
    if (index == 3) return vec3(0.+abs(sin(time))*0.1, 0.5, 0.2);
    if (index == 4) return vec3(0., 0.6, 0.25);
    if (index == 5) return vec3(0., 0.65+abs(sin(time))*0.1, 0.3);
    if (index == 6) return vec3(0.+abs(sin(time))*0.1, 0.75, 0.4);
    return vec3((sin(time*1.1))*0.15+0.65,(sin(time*1.2))*0.15+0.5,(sin(time*1.3))*0.15+0.5);
}

// sky
vec3 getPaletteColor4(int index) {
    if (index == 0) return vec3(0.15, 0.1, 0.25+abs(sin(time))*0.1);
    if (index == 1) return vec3(0.1, 0.3+abs(sin(time))*0.1, 0.45);
    if (index == 2) return vec3(0.15, 0.45, 0.65);
    if (index == 3) return vec3(0.2+abs(sin(time))*0.1, 0.6, 0.8);
    if (index == 4) return vec3(0.25, 0.7, 0.9);
    if (index == 5) return vec3(0.3, 0.8+abs(sin(time))*0.05, 0.95);
    if (index == 6) return vec3(0.2+abs(sin(time))*0.1, 0.9, 0.98);
    return vec3((sin(time*1.1))*0.05+0.95,(sin(time*1.2))*0.05+0.95,(sin(time*1.3))*0.02+0.98);
}


// vec3 getPaletteColor2(int index) {
//     if (index == 0) return vec3(0.0, 0.05, 0.15+abs(sin(time))*0.1);
//     if (index == 1) return vec3(0.0, 0.15+abs(sin(time))*0.1, 0.35);
//     if (index == 2) return vec3(0.0, 0.3, 0.5);
//     if (index == 3) return vec3(0.0+abs(sin(time))*0.1, 0.5, 0.65);
//     if (index == 4) return vec3(0.1, 0.65, 0.75);
//     if (index == 5) return vec3(0.3, 0.75+abs(sin(time))*0.1, 0.85);
//     if (index == 6) return vec3(0.5+abs(sin(time))*0.1, 0.85, 0.95);
//     return vec3((sin(time*1.1))*0.2+0.7,(sin(time*1.2))*0.15+0.9,(sin(time*1.3))*0.05+0.95);
// }

vec3 getPaletteColor(int index, int paletteIndex) {
    if (paletteIndex == 1) return getPaletteColor1(index);
    if (paletteIndex == 2) return getPaletteColor2(index);
    if (paletteIndex == 3) return getPaletteColor3(index);
    if (paletteIndex == 4) return getPaletteColor4(index);
    return getPaletteColor0(index);
}

vec3 customColorMap(float t, int paletteIndex) {
    t = clamp(t, 0.0, 1.0);

    float scaledT = t * 11.0;
    int index = int(floor(scaledT));
    float localT = fract(scaledT);

    if (index < 0) index = 0;
    if (index > 10) index = 10;

    vec3 color1 = getPaletteColor(index, paletteIndex);
    vec3 color2 = getPaletteColor(index + 1, paletteIndex);

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

vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
void main() {
    vec2 uv = vTexCoord;
    if(flipV) {
        uv.y = 1.0 - uv.y;
    }

    vec4 maskColor = texture2D(uMaskTexture, uv);
    int paletteIndex = int(maskColor.b * 255.0);
    
    float maskedTime = time * mix(-1.2, 1.2, maskColor.g);

    vec2 pos = uv * vec2(width, height);
    vec2 center = vec2(width/2., height/2.);
    vec2 distortedPos = pos;

    distortedPos.x += sin(distortedPos.y*0.1 + maskedTime*0.01) * 0.02;
    distortedPos.y += sin(distortedPos.x*0.1 + maskedTime*0.01) * 0.02;

    // lens
    for (int i = 0; i < 5; i++) {
        float ii = float(i);

        float angle = ii * 2.0 + maskedTime * 0.03;
        float radius = width * 0.3 * (0.5 + sin(maskedTime * 0.02 + ii) * 0.5);
        vec2 lensCenter = center + vec2(cos(angle), sin(angle)) * radius;

        float lensSize = width * 0.15 * (0.8 + sin(ii + maskedTime*0.01) * 0.2);
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

    float cycleDuration = 5.0;
    float cyclePhase = mod(maskedTime, cycleDuration) / cycleDuration;

    float wavePosition = cyclePhase;
    float waveWidth = 0.4;

    float distToWave = abs(uv.x - wavePosition);
    float spatialMask = 1.0 - smoothstep(0.0, waveWidth, distToWave);
    float timeMask = smoothCurve(cyclePhase);

    float mixFactor = spatialMask * timeMask;

    float luminance = getLuminance(texColor.rgb);

    float breathCycle = sin(maskedTime * 2.0) * 0.5 + 0.5;
    float spatialVar = sin(maskedTime * 3.0 + uv.x * PI * 4.0) * 0.5 + 0.5;

    vec3 warp = warpColor(uv, maskedTime * 0.05);

    float colorValue = luminance 
        + breathCycle * 0.5 * mixFactor
        + spatialVar * 0.4 * mixFactor;
    colorValue = clamp(colorValue, 0.0, 1.0);

    vec3 paletteColor = customColorMap(colorValue, paletteIndex);
    vec3 combinedEffect = paletteColor * 0.8 + warp * 0.2;
    
    vec3 mappedColor = mix(texColor.rgb, combinedEffect, 0.7);

    vec4 originalColor = texture2D(utexture, uv);

    vec3 finalColor = mix(originalColor.rgb, mappedColor, maskColor.r * uEffectStrength);


    vec3 hsv = rgb2hsv(finalColor);
    hsv.y *= 1.3;
    hsv.z *= 1.1;
    gl_FragColor = vec4(finalColor, texColor.a);
}
