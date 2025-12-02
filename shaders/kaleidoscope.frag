// #ifdef GL_ES
// precision mediump float;
// #endif
// #define PI 3.141592654

// uniform sampler2D utexture;
// uniform sampler2D utexture2;
// uniform sampler2D utexture3;
// uniform sampler2D utexture4;
// varying vec2 vTexCoord;
// uniform float time;
// uniform float width;
// uniform float height;

// vec2 kaleido(vec2 uv) {
//     float th = atan(uv.y, uv.x);
//     float r = pow(length(uv), 0.9);

//     // float ang = mix(0.1, 5.5, abs(sin(time * 0.01) * 0.5 + 0.5));
//     float f = PI / 4.5;
    
//     th = abs(mod(th + f/4.0, f) - f/2.0) / (1.0 + r);
    
//     return vec2(cos(th), sin(th)) * r;
// }

// voi main() {
//     vec2 uv = vTexCoord;
//     uv.y = 1.0 - uv.y;
    
//     uv = uv * 2.0 - 1.0;
//     uv.y *= height / width;
    
//     vec2 kaleidoUV = kaleido(uv);
    
//     float angle = time * 0.02;
//     float c = cos(angle)*0.5;
//     float s = sin(angle)*0.5;
//     vec2 rotated = vec2(
//         kaleidoUV.x * c - kaleidoUV.y * s,
//         kaleidoUV.x * s + kaleidoUV.y * c
//     );
    
//     vec2 texUV = fract(rotated * 3.0 + 0.5);
    
//     vec4 color = texture2D(utexture, texUV);
    
//     gl_FragColor = color;
// }

#ifdef GL_ES
precision mediump float;
#endif
#define PI 3.141592654

uniform sampler2D utexture;
uniform sampler2D utexture2;
uniform sampler2D utexture3;
uniform sampler2D utexture4;

varying vec2 vTexCoord;
uniform float time;
uniform float width;
uniform float height;

// 萬花筒變換
vec2 kaleido(vec2 uv, float segments, float radialPower) {
    float th = atan(uv.y, uv.x);
    float r = pow(length(uv), radialPower);
    float f = PI / segments;
    
    th = abs(mod(th + f/4.0, f) - f/2.0) / (1.0 + r);
    
    return vec2(cos(th), sin(th)) * r;
}

// 旋轉和縮放
vec2 transformLayer(vec2 uv, float angle, float scale, float density) {
    float c = cos(angle) * scale;
    float s = sin(angle) * scale;
    vec2 rotated = vec2(
        uv.x * c - uv.y * s,
        uv.x * s + uv.y * c
    );
    return fract(rotated * density + 0.5);
}

void main() {
    vec2 uv = vTexCoord;
    uv.y = 1.0 - uv.y;
    
    uv = uv * 2.0 - 1.0;
    uv.y *= height / width;
    
    float dist = length(uv);

    vec4 finalColor;
    
    if (dist < 0.3) {
        // center
        vec2 kaleidoUV = kaleido(uv, 4.5, 0.9);
        vec2 texUV = transformLayer(kaleidoUV, time * 0.2, 0.5, 3.0);
        finalColor = texture2D(utexture, texUV);
        
    } else if (dist < 0.4) {
        // 1-2
        vec2 kaleidoUV1 = kaleido(uv, 4.5, 0.9);
        vec2 texUV1 = transformLayer(kaleidoUV1, time * 0.15, 0.5, 3.0);
        vec4 color1 = texture2D(utexture, texUV1);
        
        vec2 kaleidoUV2 = kaleido(uv, 5.5, 0.7);
        vec2 texUV2 = transformLayer(kaleidoUV2, time * 0.15, 0.6, 2.5);
        vec4 color2 = texture2D(utexture2, texUV2);
        
        float blend = smoothstep(0.3, 0.4, dist);
        finalColor = mix(color1, color2, blend);
        
    } else if (dist < 0.6) {
        // 2
        vec2 kaleidoUV = kaleido(uv, 5.5, 0.7);
        vec2 texUV = transformLayer(kaleidoUV, time * 0.1, 0.6, 2.5);
        finalColor = texture2D(utexture2, texUV);
        
    } else if (dist < 0.7) {
        // 2-3
        vec2 kaleidoUV2 = kaleido(uv, 5.5, 0.7);
        vec2 texUV2 = transformLayer(kaleidoUV2, time * 0.1, 0.6, 2.5);
        vec4 color2 = texture2D(utexture2, texUV2);
        
        vec2 kaleidoUV3 = kaleido(uv, 3.5, 0.5);
        vec2 texUV3 = transformLayer(kaleidoUV3, time * 0.1, 0.8, 4.0);
        vec4 color3 = texture2D(utexture3, texUV3);
        
        float blend = smoothstep(0.6, 0.7, dist);
        finalColor = mix(color2, color3, blend);
        
    } else if (dist < 0.9) {
        // 3
        vec2 kaleidoUV = kaleido(uv, 3.5, 0.5);
        vec2 texUV = transformLayer(kaleidoUV, time * 0.05, 0.8, 4.0);
        finalColor = texture2D(utexture3, texUV);
        
    } else if (dist < 1.0) {
        // 3-4
        vec2 kaleidoUV3 = kaleido(uv, 3.5, 0.5);
        vec2 texUV3 = transformLayer(kaleidoUV3, time * 0.05, 0.8, 4.0);
        vec4 color3 = texture2D(utexture3, texUV3);
        
        vec2 kaleidoUV4 = kaleido(uv, 6.0, 1.1);
        vec2 texUV4 = transformLayer(kaleidoUV4, time * 0.05, 0.7, 2.0);
        vec4 color4 = texture2D(utexture4, texUV4);
        
        float blend = smoothstep(0.9, 1.0, dist);
        finalColor = mix(color3, color4, blend);
        
    } else {
        // 4
        vec2 kaleidoUV = kaleido(uv, 6.0, 1.1);
        vec2 texUV = transformLayer(kaleidoUV, time * 0.025, 0.5, 2.0);
        finalColor = texture2D(utexture4, texUV);
    }
    
    gl_FragColor = finalColor;
}
