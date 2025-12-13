precision mediump float;

varying vec2 vTexCoord;

uniform float time;
uniform float width;
uniform float height;
uniform sampler2D colorTex;
uniform sampler2D utexture;
uniform sampler2D uMaskTexture;

const float PI = 3.1415926535897932384626433832795;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec3 sepiaTone(vec3 color) {
    float r = dot(color, vec3(0.393, 0.769, 0.189));
    float g = dot(color, vec3(0.349, 0.686, 0.168));
    float b = dot(color, vec3(0.272, 0.534, 0.131));
    return vec3(r, g, b);
}

float vignette(vec2 uv, float intensity, float extent) {
    vec2 centered = uv - 0.5;
    float dist = length(centered);
    return 1.0 - smoothstep(extent, extent + intensity, dist);
}

float filmGrain(vec2 uv, float time) {
    vec2 seed = uv * time ;
    return random(seed) * 0.3 - 0.1;
}

vec3 vintageContrast(vec3 color, float contrast, float brightness) {
    color = (color - 0.5) * contrast + 0.5 + brightness;
    return clamp(color, 0.0, 1.0);
}

vec3 fadedColor(vec3 color, float fadeAmount) {
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(color, vec3(luminance), fadeAmount);
}

vec3 colorShift(vec3 color, vec3 tint) {
    return color * tint;
}

float horizontalNoise(vec2 uv, float time) {
    float noiseY = floor(uv.y * 80.0);
    float noise = random(vec2(noiseY, floor(time * 10.0)));
    float shouldShow = step(0.96, random(vec2(noiseY, floor(time * 5.0))));
    return shouldShow * noise * 0.3;
}

float signalWave(vec2 uv, float time) {
    float wave = sin(uv.y * 50.0 + time * 3.0) * 0.002;
    return wave;
}

vec2 getGlitchOffset(vec2 uv, float time, int channel) {
    float quantizedTime = floor(time * 5.0);
    
    float stripHeight = 0.5;
    float stripIndex = floor(uv.y / stripHeight);
    
    vec2 seed = vec2(stripIndex, quantizedTime + float(channel) * 100.0);
    
    float shouldGlitch = step(0.95, random(seed));
    
    float horizontalOffset = (random(seed + 0.5) - 0.5) * 0.03 * shouldGlitch;
    
    float bigGlitch = step(0.98, random(seed + 1.0));
    horizontalOffset += (random(seed + 2.0) - 0.5) * 0.08 * bigGlitch;
    
    return vec2(horizontalOffset, 0.0);
}

vec2 getGlobalShake(float time, int channel) {
    float quantizedTime = floor(time * .5);
    vec2 seed = vec2(quantizedTime, float(channel) * 50.0);
    
    float shouldShake = step(0.95, random(seed));
    
    float shakeX = (random(seed + 0.1) - 0.5) * 0.01 * shouldShake;
    float shakeY = (random(seed + 0.2) - 0.5) * 0.005 * shouldShake;
    
    return vec2(shakeX, shakeY);
}

vec3 getRGBSeparation(sampler2D tex, vec2 uv, float time) {
    vec2 offsetR = getGlitchOffset(uv, time, 0) + getGlobalShake(time, 0);
    vec2 offsetG = getGlitchOffset(uv, time, 1) + getGlobalShake(time, 1);
    vec2 offsetB = getGlitchOffset(uv, time, 2) + getGlobalShake(time, 2);
    
    float baseOffset = 0.002;
    offsetR.x += baseOffset;
    offsetB.x -= baseOffset;
    
    float r = texture2D(tex, uv + offsetR).r;
    float g = texture2D(tex, uv + offsetG).g;
    float b = texture2D(tex, uv + offsetB).b;
    
    return vec3(r, g, b);
}

float getVerticalGlitch(vec2 uv, float time) {
    float quantizedTime = floor(time * 4.0);
    
    float gridY = floor(uv.y * 20.0);
    float gridX = floor(uv.y * 15.0 + random(vec2(gridY, quantizedTime)) * 2.0);
    
    vec2 gridPos = vec2(gridY, gridX);
    vec2 seed = vec2(gridPos.x, gridPos.y + quantizedTime);
    // glitch ot not
    float shouldGlitch = step(0.5, random(seed));
    float horizontalBar = step(0.9, random(vec2(gridY, quantizedTime)));
    
    float fineGridX = floor(uv.x * 400.0);
    float fineGridY = floor(uv.y * 200.0);
    
    float cutout = step(0.3, random(vec2(fineGridX, fineGridY + quantizedTime)));
    
    float pattern = horizontalBar * cutout * shouldGlitch;

    float brightness = (random(seed + 0.5) - 0.5) * 0.4 * pattern;
    
    return brightness;
}
void main() {
    vec2 uv = vTexCoord;
    vec2 pixelPos = uv * vec2(width, height);
    vec2 center = vec2(width / 2.0, height / 2.0);

    vec4 maskColor = texture2D(uMaskTexture, uv);
    vec4 originalColor = texture2D(utexture, uv );
    
    vec3 glitchedColor = getRGBSeparation(utexture, uv, time);
    
    float verticalGlitch = getVerticalGlitch(uv, time);
    glitchedColor += vec3(verticalGlitch);
    vec3 finalColor = mix(originalColor.rgb, glitchedColor, maskColor.r);

    vec3 sepiaColor = sepiaTone(finalColor);
    finalColor = mix(finalColor, sepiaColor, 0.5);
    
    finalColor = fadedColor(finalColor, 0.4);
    
    finalColor = vintageContrast(finalColor, 0.9, -0.05);
    
    vec3 warmTint = vec3(1.05, 1.0, 0.9);
    finalColor = colorShift(finalColor, warmTint);
    
    float grain = filmGrain(vTexCoord, time * 0.5);
    finalColor += grain;

    float vignetteEffect = vignette(vTexCoord, 0.5, 0.35);
    finalColor *= vignetteEffect;
    
    finalColor = clamp(finalColor, 0.0, 1.0);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
