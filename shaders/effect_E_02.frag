precision mediump float;

varying vec2 vTexCoord;

uniform float time;
uniform float width;
uniform float height;
uniform sampler2D utexture;
uniform sampler2D uMaskTexture;
uniform float uEffectStrength;

vec3 hash3(float n) {
    return fract(sin(vec3(n, n + 1.0, n + 2.0)) * 43758.5453123);
}

vec4 hash4(float n) {
    return fract(sin(vec4(n, n + 1.0, n + 2.0, n + 3.0)) * 43758.5453123);
}

vec3 textureWithMotionBlur(in vec2 uv,in vec2 velocity,in int samples,in float intensity) {
    vec3 col = vec3(0.0);
    float totalWeight = 0.0;

    for (int i = 0; i < 16; i++) {
        if (i >= samples) break;

        float t = float(i) / float(samples - 1);
        vec2 offset = velocity * (t - 0.5) * intensity;
        vec2 sampleUV = uv + offset;

        // Weight falloff from center
        float weight = 1.0 - abs(t - 0.5) * 2.0;
        weight = weight * weight;

        if (sampleUV.x >= 0.0 && sampleUV.x <= 1.0 && 
            sampleUV.y >= 0.0 && sampleUV.y <= 1.0) {
            col += texture2D(utexture, sampleUV).rgb * weight;
            totalWeight += weight;
        }
    }

    return col / max(totalWeight, 0.001);
}

vec3 speed(in vec2 uv, in float time, in float strength) {
    vec4 originalColor = texture2D(utexture, uv);
    vec3 col = originalColor.rgb;

    if (strength < 0.01) return col;

    for (float i = 0.0; i < 30.0; i += 1.0) {
        vec4 id = hash4(i * 13.13);

        float stripY = id.x;
        float stripHeight = 0.01 + id.y * 0.08;
        float speed = 1.0 + id.z * 4.0;
        float timeOffset = id.w * 4.0;

        float moveTime = mod(time * speed * 0.4 + timeOffset, 2.5);
        float progress = moveTime / 2.5;

        float stripLeft = -0.8 + progress * 1.8;
        float stripRight = stripLeft + 0.8;

        bool inScreen = (stripRight > 0.0 && stripLeft < 1.0);

        if (inScreen && uv.x >= stripLeft && uv.x <= stripRight) {
            float distY = abs(uv.y - stripY);

            if (distY < stripHeight) {
                float yFade = smoothstep(stripHeight, stripHeight * 0.3, distY);

                float xPos = (uv.x - stripLeft) * 1.25;
                float xFadeIn = smoothstep(0.0, 0.25, xPos);
                float xFadeOut = 1.0 - smoothstep(0.75, 1.0, xPos);
                float xFade = xFadeIn * xFadeOut;

                float totalFade = yFade * xFade;

                if (totalFade > 0.01) {
                    float blurAmount = 0.01 + id.w * 0.09;
                    vec2 velocity = vec2(blurAmount, 0.0);

                    int samples = 12;
                    vec3 blurred = textureWithMotionBlur(uv, velocity, samples, strength);

                    float speedRatio = id.z;
                    float brightness = 1.0 + 0.2 * speedRatio;
                    blurred *= brightness;

                    col = mix(col, blurred, totalFade * strength);
                }
            }
        }
    }

    return col;
}

void main() {
    vec2 uv = vTexCoord;

    vec4 originalColor = texture2D(utexture, uv);

    vec3 effectColor = speed(uv, time, 1.0);

    vec4 maskColor = texture2D(uMaskTexture, uv);
    vec3 finalColor = mix(originalColor.rgb, effectColor, maskColor.r);

    finalColor = pow(finalColor, vec3(0.4545));

    vec2 p = (uv - 0.5) * 2.0;
    finalColor += (1.0 / 255.0) * hash3(p.x + 13.0 * p.y);

    vec3 effectFinalColor = mix(originalColor.rgb, finalColor, uEffectStrength);

    gl_FragColor = vec4(effectFinalColor, originalColor.a);
}
