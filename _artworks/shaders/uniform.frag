#ifdef GL_ES
precision mediump float;
#endif
#define PI 3.141592654


uniform sampler2D utexture;
varying vec2 vTexCoord;
uniform vec2 resolution;
uniform float time;
uniform float width;
uniform float height;

#define LENS_SHAPE 0

float map(float value, float min1, float max1, float min2, float max2) {
    float pct = (value - min1) / (max1 - min1);
    float result = min2 + (max2-min2)*pct;
    return result;
}

// constrained map 
float mapc(float value, float min1, float max1, float min2, float max2) {    
    float value2 = clamp(value, min1, max1);
    return map(value2, min1, max1, min2, max2);
}

float atan2(in float y, in float x){
  return x == 0.0 ? sign(y)*PI/2.0 : atan(y, x);
}

float random (vec2 st) {
    return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*437580.5453123);
}

//  main() {
// //     vec2 uv = vTexCoord-0.5;
// //     vec2 center = vec2(width/2., height/2.);

//     vec2 uv = vTexCoord;
//     uv.y = 1. - uv.y;
    

//     vec2 distortedUV = uv + vec2(sin(uv.y * 20.0 + time * 2.0) * 0.02, 0.0);
//     vec4 texColor = texture2D(utexture, distortedUV);

//     gl_FragColor = texColor;
// }

void main() {

  vec2 uv = vTexCoord;
  uv.y = 1.0 - uv.y;
  
  // convert this to a pixel position (uv space goes from 0,0 to 1,1)
  vec2 pos = uv * vec2(width, height);
  vec2 center = vec2(width/2., height/2.);
  
  vec2 distortedPos = pos;
  
  distortedPos.x += sin(distortedPos.y*0.1 + time*0.1) * 0.05;
  distortedPos.y += sin(distortedPos.x*0.1 + time*0.1) * 0.05;

// basic簡單透鏡
//   for (int i = 0; i < 10; i++){
//     vec2 lensCenter = vec2(width/2. + sin(float(i))*1000., height/2.);
//     float distCenter = distance(distortedPos, lensCenter);
//     // lens radius 
//     float lensRadius = width + width * sin(float(i)+time*0.1);
//     if (distCenter < lensRadius){
//         float pct = 1. - (distCenter / lensRadius);
//         vec2 diff = normalize(distortedPos - lensCenter);
//         distortedPos = lensCenter + diff * distCenter * mapc(sin(pct*100.)-1., -1., 0.5, 1., 1.2); 
//     }
//   }

  for (int i = 0; i < 10; i++){
    float ii = float(i);
    vec2 lensCenter = vec2(width/2. + sin(ii)*1000., height/2.);
    
    float lensSize = width + width * sin(ii + time*0.05);
    float pct;
    bool inLens = false;
    
    #if LENS_SHAPE == 0
    // 圓形透鏡
    float distCenter = distance(distortedPos, lensCenter);
    if (distCenter < lensSize) {
        pct = 1.0 - (distCenter / lensSize);
        inLens = true;
    }
    
    // 放射透鏡 波光粼粼
    #elif LENS_SHAPE == 1
    vec2 diff = abs(distortedPos - lensCenter)*0.4*random(uv*0.5);
    float maxDist = max(diff.x, diff.y);
    if (maxDist < lensSize) {
        pct = 1.0 - (maxDist / lensSize);
        inLens = true;
    }
    
    // 長虹玻璃
    #elif LENS_SHAPE == 2
    vec2 diff = abs(distortedPos - lensCenter);
    float barWidth = lensSize * 0.5;
    float barHeight = lensSize * 1.5;
    if (diff.x < barWidth && diff.y < barHeight) {
        pct = 1.0 - (diff.x / barWidth);
        inLens = true;
    }
    
    //霧面 局部 波光粼粼
    #elif LENS_SHAPE == 3
    vec2 diff = abs(distortedPos - lensCenter);
    float barWidth = lensSize * 1.5;   // 寬度為 150%
    float barHeight = lensSize * 0.5 * random(uv);  // 高度為 20%
    if (diff.x < barWidth && diff.y < barHeight) {
        pct = 1.0 - (diff.y / barHeight);
        inLens = true;
    }
    #endif
    
    // 應用扭曲
    if (inLens) {
    //  float pct = 1. - (distCenter / lensRadius);
        vec2 diff = normalize(distortedPos - lensCenter);
        float distCenter = distance(distortedPos, lensCenter);
        distortedPos = lensCenter + diff * distCenter * mapc(sin(pct*100.)-1., -1., 0.5, 1., 1.2); 
    }
  }

  vec2 finalUV = distortedPos / vec2(width, height);
  
  finalUV = clamp(finalUV, 0.0, 1.0);
  
  vec4 texColor = texture2D(utexture, finalUV);
  
  gl_FragColor = texColor;
}
