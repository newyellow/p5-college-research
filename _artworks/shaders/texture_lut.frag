precision mediump float;

uniform sampler2D uMainTexture;

uniform vec2 uTextureScale;
uniform vec2 uTextureOffset;

// LUT uniforms
uniform sampler2D uLutTexture;
uniform float uLutIntensity;
uniform int uDoLut;

varying vec4 vColor;
varying vec2 vUV;

vec3 applyLUT(vec3 color) {
    // LUT lookup logic
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

void main() {
    vec2 uv = vUV * uTextureScale + uTextureOffset;
    vec4 textureColor = texture2D(uMainTexture, uv);

    // Apply LUT if enabled
    if(uDoLut == 1) {
        textureColor.rgb = applyLUT(textureColor.rgb);
    }

    gl_FragColor = textureColor;
}

