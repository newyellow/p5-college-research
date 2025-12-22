#ifdef GL_ES
precision mediump float;
#endif
#define PI 3.141592654

uniform sampler2D utexture;
uniform sampler2D utexture2;
uniform sampler2D utexture3;
uniform sampler2D utexture4;

uniform float aspect1;
uniform float aspect2;
uniform float aspect3;
uniform float aspect4;

// LUT uniforms
uniform sampler2D uLutTexture;
uniform float uLutIntensity;
uniform int uDoLut;

varying vec2 vTexCoord;
uniform float time;
uniform float width;
uniform float height;

// LUT lookup logic
vec3 applyLUT(vec3 color) {
    // Assuming 512x512 LUT texture (64x64x64 color cube)
    // arranged as 8x8 grid of 64x64 slices
    float blueColor = color.b * 63.0;

    vec2 quad1;
    quad1.y = floor(floor(blueColor) / 8.0);
    quad1.x = floor(blueColor) - (quad1.y * 8.0);

    vec2 quad2;
    quad2.y = floor(ceil(blueColor) / 8.0);
    quad2.x = ceil(blueColor) - (quad2.y * 8.0);

    vec2 texPos1;
    texPos1.x = (quad1.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * color.r);
    texPos1.y = (quad1.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * color.g);

    vec2 texPos2;
    texPos2.x = (quad2.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * color.r);
    texPos2.y = (quad2.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * color.g);

    vec4 newColor1 = texture2D(uLutTexture, texPos1);
    vec4 newColor2 = texture2D(uLutTexture, texPos2);

    vec4 lutColor = mix(newColor1, newColor2, fract(blueColor));

    return mix(color, lutColor.rgb, uLutIntensity);
}

// 萬花筒變換
vec2 kaleido(vec2 uv, float segments, float radialPower) {
    float th = atan(uv.y, uv.x);
    float r = pow(length(uv), radialPower);
    float f = PI / segments;

    th = abs(mod(th + f/4.0, f) - f/2.0) / (1.0 + r);

    return vec2(cos(th), sin(th)) * r;
}

vec2 transformLayer(vec2 uv, float angle, float scale, float density, float aspect) {
    vec2 correctedUV = uv;
    if (aspect > 1.0) {
        correctedUV.y /= aspect;
    } else {
        correctedUV.x *= aspect;
    }

    float c = cos(angle) * scale;
    float s = sin(angle) * scale;
    vec2 rotated = vec2(
        correctedUV.x * c - correctedUV.y * s,
        correctedUV.x * s + correctedUV.y * c);
    return fract(rotated * density + 0.5);
}
vec4 getSampleColor(vec2 uv, float dist) {
    vec4 color;
    
    if (dist < 0.3) {
        vec2 kaleidoUV = kaleido(uv, 4.5, 0.9);
        vec2 texUV = transformLayer(kaleidoUV, time * 0.2, 0.5, 3.0, aspect1);
        color = texture2D(utexture, texUV);
    } else if (dist < 0.4) {
        vec2 kaleidoUV1 = kaleido(uv, 4.5, 0.9);
        vec2 texUV1 = transformLayer(kaleidoUV1, time * 0.15, 0.5, 3.0, aspect1);
        vec4 color1 = texture2D(utexture, texUV1);

        vec2 kaleidoUV2 = kaleido(uv, 5.5, 0.7);
        vec2 texUV2 = transformLayer(kaleidoUV2, time * 0.15, 0.6, 2.5, aspect2);
        vec4 color2 = texture2D(utexture2, texUV2);

        float blend = smoothstep(0.3, 0.4, dist);
        color = mix(color1, color2, blend);
    } else if (dist < 0.6) {
        vec2 kaleidoUV = kaleido(uv, 5.5, 0.7);
        vec2 texUV = transformLayer(kaleidoUV, time * 0.1, 0.6, 2.5, aspect2);
        color = texture2D(utexture2, texUV);
    } else if (dist < 0.7) {
        vec2 kaleidoUV2 = kaleido(uv, 5.5, 0.7);
        vec2 texUV2 = transformLayer(kaleidoUV2, time * 0.1, 0.6, 2.5, aspect2);
        vec4 color2 = texture2D(utexture2, texUV2);

        vec2 kaleidoUV3 = kaleido(uv, 3.5, 0.5);
        vec2 texUV3 = transformLayer(kaleidoUV3, time * 0.1, 0.8, 4.0, aspect3);
        vec4 color3 = texture2D(utexture3, texUV3);

        float blend = smoothstep(0.6, 0.7, dist);
        color = mix(color2, color3, blend);
    } else if (dist < 0.9) {
        vec2 kaleidoUV = kaleido(uv, 3.5, 0.5);
        vec2 texUV = transformLayer(kaleidoUV, time * 0.05, 0.8, 4.0, aspect3);
        color = texture2D(utexture3, texUV);
    } else if (dist < 1.0) {
        vec2 kaleidoUV3 = kaleido(uv, 3.5, 0.5);
        vec2 texUV3 = transformLayer(kaleidoUV3, time * 0.05, 0.8, 4.0, aspect3);
        vec4 color3 = texture2D(utexture3, texUV3);

        vec2 kaleidoUV4 = kaleido(uv, 6.0, 1.1);
        vec2 texUV4 = transformLayer(kaleidoUV4, time * 0.05, 0.7, 2.0, aspect4);
        vec4 color4 = texture2D(utexture4, texUV4);

        float blend = smoothstep(0.9, 1.0, dist);
        color = mix(color3, color4, blend);
    } else {
        vec2 kaleidoUV = kaleido(uv, 6.0, 1.1);
        vec2 texUV = transformLayer(kaleidoUV, time * 0.025, 0.5, 2.0, aspect4);
        color = texture2D(utexture4, texUV);
    }
    
    return color;
}
vec4 applyBloom(vec2 uv, vec2 normalizedUV, float dist) {
    vec4 bloom = vec4(0.0);
    float angle = time * 0.6;
    for(int i = 0; i < 8; i++) {
        float a = float(i) / float(8) * PI * 2.0 + angle;
        vec2 offset = vec2(cos(a), sin(a)) *0.1 * (1.0 + dist * 0.5);
        
        vec2 sampleUV = normalizedUV + offset;
        sampleUV = sampleUV * 2.0 - 1.0;
        sampleUV.y *= height / width;
        
        float sampleDist = length(sampleUV);
        vec4 sampleColor = getSampleColor(sampleUV, sampleDist);
        
        bloom += sampleColor * (1.0 - float(i) / float(8));
    }
    bloom /= float(8);
    bloom *=0.8;
    
    return bloom;
}


void main() {
    vec2 normalizedUV = vTexCoord;
    vec2 uv = normalizedUV;
    uv.y = 1.0 - uv.y;
    uv = uv * 2.0 - 1.0;
    uv.y *= height / width;

    float dist = length(uv);

    vec4 finalColor = getSampleColor(uv,dist);
    
    vec4 bloomColor = applyBloom(uv, normalizedUV, dist);
    finalColor.rgb += bloomColor.rgb;
    
    if (uDoLut == 1) {
        finalColor.rgb = applyLUT(finalColor.rgb);
    }

    gl_FragColor = finalColor;
}
