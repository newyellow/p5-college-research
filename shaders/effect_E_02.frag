precision mediump float;

varying vec2 vTexCoord;

uniform float time;
uniform float width;
uniform float height;
uniform sampler2D colorTex;
uniform sampler2D utexture;
uniform sampler2D uMaskTexture;


void main() {
    vec2 uv = vTexCoord;
    vec3 color = vec3(0.);
    color = vec3(uv.x,uv.y,abs(sin(time)));

    vec4 maskColor = texture2D(uMaskTexture, uv);
    vec4 originalColor = texture2D(utexture, uv);
    vec3 finalColor = mix(originalColor.rgb, color.rgb, maskColor.r);
    
   gl_FragColor = vec4(finalColor,1.0);
}