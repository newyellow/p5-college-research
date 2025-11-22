precision mediump float;

uniform sampler2D uMainTexture;
uniform vec2 uTextureSize; // width, height of the texture
uniform vec2 uShadowOffset; // X, Y offset for shadow position (in pixels, converted to UV)
uniform float uBlurRadius; // Blur radius in pixels
uniform vec4 uShadowColor; // RGBA color for the shadow
uniform float uShadowOpacity; // Opacity of the shadow (0.0 - 1.0)
uniform float uBlurQuality; // Blur quality (1.0 = low, 2.0 = medium, 3.0+ = high)

varying vec2 vUV;

// Simple box blur with Gaussian-like falloff
float sampleShadowAlpha(vec2 uv, float radius) {
  vec2 pixelSize = 1.0 / uTextureSize;
  float totalAlpha = 0.0;
  float totalWeight = 0.0;
  
  // Determine sample step based on blur quality
  // Higher quality = smaller step = more samples
  float sampleStep = radius / max(1.0, uBlurQuality * 2.0);
  
  // Sample in a pattern: center + 4 directions + 4 corners
  // This gives good blur quality with reasonable performance
  
  // Center (highest weight)
  vec4 centerColor = texture2D(uMainTexture, clamp(uv, vec2(0.0), vec2(1.0)));
  totalAlpha += centerColor.a * 1.0;
  totalWeight += 1.0;
  
  // Right
  vec2 rightUV = clamp(uv + vec2(sampleStep * pixelSize.x, 0.0), vec2(0.0), vec2(1.0));
  totalAlpha += texture2D(uMainTexture, rightUV).a * 0.8;
  totalWeight += 0.8;
  
  // Left
  vec2 leftUV = clamp(uv + vec2(-sampleStep * pixelSize.x, 0.0), vec2(0.0), vec2(1.0));
  totalAlpha += texture2D(uMainTexture, leftUV).a * 0.8;
  totalWeight += 0.8;
  
  // Up
  vec2 upUV = clamp(uv + vec2(0.0, -sampleStep * pixelSize.y), vec2(0.0), vec2(1.0));
  totalAlpha += texture2D(uMainTexture, upUV).a * 0.8;
  totalWeight += 0.8;
  
  // Down
  vec2 downUV = clamp(uv + vec2(0.0, sampleStep * pixelSize.y), vec2(0.0), vec2(1.0));
  totalAlpha += texture2D(uMainTexture, downUV).a * 0.8;
  totalWeight += 0.8;
  
  // Diagonals (lower weight)
  vec2 diag1UV = clamp(uv + vec2(sampleStep * pixelSize.x * 0.707, sampleStep * pixelSize.y * 0.707), vec2(0.0), vec2(1.0));
  totalAlpha += texture2D(uMainTexture, diag1UV).a * 0.6;
  totalWeight += 0.6;
  
  vec2 diag2UV = clamp(uv + vec2(-sampleStep * pixelSize.x * 0.707, sampleStep * pixelSize.y * 0.707), vec2(0.0), vec2(1.0));
  totalAlpha += texture2D(uMainTexture, diag2UV).a * 0.6;
  totalWeight += 0.6;
  
  vec2 diag3UV = clamp(uv + vec2(sampleStep * pixelSize.x * 0.707, -sampleStep * pixelSize.y * 0.707), vec2(0.0), vec2(1.0));
  totalAlpha += texture2D(uMainTexture, diag3UV).a * 0.6;
  totalWeight += 0.6;
  
  vec2 diag4UV = clamp(uv + vec2(-sampleStep * pixelSize.x * 0.707, -sampleStep * pixelSize.y * 0.707), vec2(0.0), vec2(1.0));
  totalAlpha += texture2D(uMainTexture, diag4UV).a * 0.6;
  totalWeight += 0.6;
  
  // Extended samples for higher quality
  if (uBlurQuality > 1.5) {
    vec2 extRightUV = clamp(uv + vec2(sampleStep * pixelSize.x * 2.0, 0.0), vec2(0.0), vec2(1.0));
    totalAlpha += texture2D(uMainTexture, extRightUV).a * 0.4;
    totalWeight += 0.4;
    
    vec2 extLeftUV = clamp(uv + vec2(-sampleStep * pixelSize.x * 2.0, 0.0), vec2(0.0), vec2(1.0));
    totalAlpha += texture2D(uMainTexture, extLeftUV).a * 0.4;
    totalWeight += 0.4;
    
    vec2 extUpUV = clamp(uv + vec2(0.0, -sampleStep * pixelSize.y * 2.0), vec2(0.0), vec2(1.0));
    totalAlpha += texture2D(uMainTexture, extUpUV).a * 0.4;
    totalWeight += 0.4;
    
    vec2 extDownUV = clamp(uv + vec2(0.0, sampleStep * pixelSize.y * 2.0), vec2(0.0), vec2(1.0));
    totalAlpha += texture2D(uMainTexture, extDownUV).a * 0.4;
    totalWeight += 0.4;
  }
  
  return totalWeight > 0.0 ? totalAlpha / totalWeight : 0.0;
}

void main() {
  // Calculate the size of one pixel in UV space
  vec2 pixelSize = 1.0 / uTextureSize;
  
  // Sample the original pixel (for rendering the image on top)
  vec4 originalColor = texture2D(uMainTexture, vUV);
  
  // Calculate shadow position (offset from current UV, convert pixel offset to UV)
  vec2 shadowOffsetUV = uShadowOffset * pixelSize;
  vec2 shadowUV = vUV + shadowOffsetUV;
  
  // Sample shadow with blur
  float shadowAlpha = 0.0;
  if (shadowUV.x >= 0.0 && shadowUV.x <= 1.0 && shadowUV.y >= 0.0 && shadowUV.y <= 1.0) {
    shadowAlpha = sampleShadowAlpha(shadowUV, uBlurRadius);
  }
  
  // Apply shadow opacity
  shadowAlpha *= uShadowOpacity;
  
  // Create shadow color with calculated alpha
  vec4 shadowColor = vec4(uShadowColor.rgb, shadowAlpha * uShadowColor.a);
  
  // Composite: shadow behind, original image on top
  // Alpha blending: result = foreground + background * (1 - foreground.alpha)
  vec3 finalColor = originalColor.rgb * originalColor.a + shadowColor.rgb * shadowColor.a * (1.0 - originalColor.a);
  float finalAlpha = originalColor.a + shadowColor.a * (1.0 - originalColor.a);
  
  gl_FragColor = vec4(finalColor, finalAlpha);
}

