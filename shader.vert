// default values
attribute vec3 aPosition;
attribute vec2 aTexCoord;
attribute vec4 aVertexColor;
// default values 


uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying vec2 vUV;

void main() {
  vUV = aTexCoord;
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
}

