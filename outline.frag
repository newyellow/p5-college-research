precision mediump float;

uniform sampler2D uMainTexture;
uniform vec2 uTextureSize; // width, height of the texture
uniform vec4 uOutlineColor; // RGBA color for the outline
uniform float uOutlineThickness; // thickness of the outline in pixels
uniform float uEdgeThreshold; // threshold for edge detection (0.0 - 1.0)
uniform float uNoiseXOffset; // X offset for noise sampling
uniform float uNoiseYOffset; // Y offset for noise sampling
uniform float uNoiseScaleX; // X scale for noise frequency
uniform float uNoiseScaleY; // Y scale for noise frequency
uniform float uNoiseWeight; // Weight of noise effect (0.0 = no noise, 1.0 = full noise)

varying vec2 vUV;

// Simple 2D hash function for noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// 2D noise function
float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  // Calculate the size of one pixel in UV space
  vec2 pixelSize = 1.0 / uTextureSize;
  
  // Sample the center pixel
  vec4 centerColor = texture2D(uMainTexture, vUV);
  float centerAlpha = centerColor.a;
  
  // Calculate noise-based thickness variation
  vec2 noiseCoord = (vUV * vec2(uNoiseScaleX, uNoiseScaleY)) + vec2(uNoiseXOffset, uNoiseYOffset);
  float noiseValue = noise2D(noiseCoord);
  
  // Remap noise from [0, 1] to [-1, 1] and apply weight
  float noiseVariation = (noiseValue * 2.0 - 1.0) * uNoiseWeight;
  
  // Calculate final thickness with noise variation
  // Noise variation: -1 to 1, so thickness can vary from 0 to 2x base thickness
  float finalThickness = uOutlineThickness * (1.0 + noiseVariation);
  
  // Sample neighboring pixels for edge detection with variable thickness
  // Sample 8 neighboring pixels
  vec4 topLeft = texture2D(uMainTexture, vUV + vec2(-pixelSize.x, -pixelSize.y) * finalThickness);
  vec4 top = texture2D(uMainTexture, vUV + vec2(0.0, -pixelSize.y) * finalThickness);
  vec4 topRight = texture2D(uMainTexture, vUV + vec2(pixelSize.x, -pixelSize.y) * finalThickness);
  vec4 left = texture2D(uMainTexture, vUV + vec2(-pixelSize.x, 0.0) * finalThickness);
  vec4 right = texture2D(uMainTexture, vUV + vec2(pixelSize.x, 0.0) * finalThickness);
  vec4 bottomLeft = texture2D(uMainTexture, vUV + vec2(-pixelSize.x, pixelSize.y) * finalThickness);
  vec4 bottom = texture2D(uMainTexture, vUV + vec2(0.0, pixelSize.y) * finalThickness);
  vec4 bottomRight = texture2D(uMainTexture, vUV + vec2(pixelSize.x, pixelSize.y) * finalThickness);
  
  // Find the maximum and minimum alpha among neighbors
  float maxNeighborAlpha = max(max(max(topLeft.a, top.a), max(topRight.a, left.a)), 
                                max(max(right.a, bottomLeft.a), max(bottom.a, bottomRight.a)));
  float minNeighborAlpha = min(min(min(topLeft.a, top.a), min(topRight.a, left.a)), 
                                min(min(right.a, bottomLeft.a), min(bottom.a, bottomRight.a)));
  
  // Calculate alpha difference to detect edges
  float alphaRange = maxNeighborAlpha - minNeighborAlpha;
  float centerToMaxDiff = abs(centerAlpha - maxNeighborAlpha);
  float centerToMinDiff = abs(centerAlpha - minNeighborAlpha);
  
  // Detect if we're at an edge (transparency boundary)
  // Edge exists when there's a significant alpha difference between center and neighbors
  bool isAtEdge = false;
  float edgeStrength = 0.0;
  
  // Case 1: Center is more transparent than neighbors (outside edge)
  if (centerAlpha < maxNeighborAlpha - uEdgeThreshold * 0.5) {
    isAtEdge = true;
    edgeStrength = (maxNeighborAlpha - centerAlpha);
  }
  // Case 2: Center is more opaque than neighbors (inside edge, less common but possible)
  else if (centerAlpha > minNeighborAlpha + uEdgeThreshold * 0.5 && minNeighborAlpha < uEdgeThreshold) {
    isAtEdge = true;
    edgeStrength = (centerAlpha - minNeighborAlpha);
  }
  // Case 3: Significant alpha variation in neighbors (edge region)
  else if (alphaRange > uEdgeThreshold && (centerToMaxDiff > uEdgeThreshold * 0.3 || centerToMinDiff > uEdgeThreshold * 0.3)) {
    isAtEdge = true;
    edgeStrength = alphaRange;
  }
  
  // Draw outline with blending for semi-transparent edges
  if (isAtEdge) {
    // Blend outline color with original pixel color
    // The outline is "under" the pixel, so:
    // - More transparent pixels (low alpha) show more outline
    // - More opaque pixels (high alpha) show more original color
    // Standard alpha blending: result = foreground * alpha + background * (1 - alpha)
    // Here: outline is background, original color is foreground
    vec3 blendedColor = centerColor.rgb * centerAlpha + uOutlineColor.rgb * (1.0 - centerAlpha);
    
    // For alpha: ensure we have enough visibility
    // Combine the original alpha with outline visibility
    // If pixel is very transparent, the outline should still be visible
    float finalAlpha = max(centerAlpha, (1.0 - centerAlpha) * uOutlineColor.a * edgeStrength);
    
    gl_FragColor = vec4(blendedColor, finalAlpha);
  } else {
    // Draw original texture (preserves both opaque and transparent areas)
    gl_FragColor = centerColor;
  }
}

