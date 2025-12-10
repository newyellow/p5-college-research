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

float getLuminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 getPaletteColor(int index) {
    if (index == 0) return vec3(0.0, 0.0, 0.2+abs(sin(time)));
    if (index == 1) return vec3(0.0, 0.3+abs(sin(time)), 0.8);
    if (index == 2) return vec3(0.0, 0.8, 0.9);
    if (index == 3) return vec3(0.0+abs(sin(time)), 0.9, 0.3);
    if (index == 4) return vec3(0.8, 0.9, 0.0);
    if (index == 5) return vec3(1.0, 0.5+abs(sin(time)), 0.0);
    if (index == 6) return vec3(1.0+abs(sin(time)), 0.1, 0.0);
    return vec3(1.0,1.0, 1.0);
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
    float strength = 0.3;
    vec2 pos = uv * 2.0;

    for(int i = 1; i < 5; i++) {
        pos.x += strength * sin(10.0 * t + float(i) * 0.5 * pos.y);
        pos.y += strength * cos(10.0 * t + float(i) * 0.5 * pos.x);
    }

    vec3 col = 0.5 + 0.5 * cos(t + pos.xyx + vec3(1, 2, 5));
    return col;
}

float gaussianCurve(float x) {
    float sigma = 0.1;
    float mu = 0.5;
    return exp(-pow(x - mu, 2.0) / (2.0 * sigma * sigma));
}

float smoothCurve(float x) {
    return sin(x * PI);
}

void main() {
    vec2 uv = vTexCoord;
    uv.y = 1.0 - uv.y;

    vec4 texColor = texture2D(utexture, uv);
    float luminance = getLuminance(texColor.rgb);

    float cycleDuration = 6.0;
    float cyclePhase = mod(time, cycleDuration) / cycleDuration;  // 0~1

    float target = sin(cyclePhase * PI * 2.0);  // -1 到 +1

    float normalizedLum = luminance * 2.0 - 1.0;

    float luminanceDiff = abs(normalizedLum - target);
    float luminanceMask = 1.0 - smoothstep(0.0, 0.8, luminanceDiff);

    float globalIntensity = sin(cyclePhase * PI);  // 0~1~0

    float mixFactor = luminanceMask * globalIntensity;

    float breathCycle = sin(time * 2.0) * 0.5 + 0.5;
    float spatialVar = sin(time * 3.0 + uv.x * PI * 4.0) * 0.5 + 0.5;

    vec3 warp = warpColor(uv, time * 0.5);
    float warpInfluence = dot(warp, vec3(0.33)) * 0.3;

    float colorValue = luminance  + breathCycle * 0.6 * mixFactor+ spatialVar * 0.5 * mixFactor+ warpInfluence * mixFactor;
    colorValue = clamp(colorValue, 0.0, 1.0);

    vec3 mappedColor = customColorMap(colorValue);

    float edge = length(uv - 0.5) * 2.0;
    float vignette = 1.0 - edge * edge * 0.5;
    mappedColor *= mix(1.0, vignette, mixFactor * 0.5);

    vec4 maskColor = texture2D(uMaskTexture, uv);
    vec3 finalColor = mix(texColor.rgb, mappedColor, maskColor.r);

    gl_FragColor = vec4(finalColor, texColor.a);
}
