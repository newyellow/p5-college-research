// this is a p5js v2 script
let _renderer = null;

let modelData = null;
let fullScreenModel = null;
let fullScreenModelData = null;

let shaderProgram;
let outlineShaderProgram;

let photoTexture = null;
let transparentTexture = null;

async function setup() {
  _renderer = createCanvas(1080, 1920, WEBGL);

  flex();
  background(30);

  photoTexture = await loadImage('images/test-photo.jpg');
  transparentTexture = await loadImage('images/test-transparent.png');

  // Load the shader
  shaderProgram = await loadShader('shader.vert', 'shader.frag');
  
  // Load the outline shader
  outlineShaderProgram = await loadShader('outline.vert', 'outline.frag');


  let newModel = new NYModel('test');
  newModel.addTriangle(0, 0, 300, 0, 0, 300);
  modelData = newModel.build(_renderer);

  fullScreenModel = new NYModel('fullscreen');
  let pLeftTop = new NYPoint(-0.5 * width, -0.5 * height, 0, 0);
  let pRightTop = new NYPoint(0.5 * width, -0.5 * height, 1, 0);
  let pLeftBottom = new NYPoint(-0.5 * width, 0.5 * height, 0, 1);
  let pRightBottom = new NYPoint(0.5 * width, 0.5 * height, 1, 1);

  fullScreenModel.addTriangleByPoints(pLeftTop, pRightTop, pLeftBottom);
  fullScreenModel.addTriangleByPoints(pRightTop, pRightBottom, pLeftBottom);
  fullScreenModelData = fullScreenModel.build(_renderer);

  // console.log(modelData);

  // Use regular shader
  // shader(shaderProgram);
  // shaderProgram.setUniform('uMainTexture', transparentTexture);
  // model(fullScreenModelData);
  
  // Use outline shader
  shader(outlineShaderProgram);
  outlineShaderProgram.setUniform('uMainTexture', transparentTexture);
  outlineShaderProgram.setUniform('uTextureSize', [transparentTexture.width, transparentTexture.height]);
  outlineShaderProgram.setUniform('uOutlineColor', [1.0, 1.0, 1.0, 1.0]); // Red outline
  outlineShaderProgram.setUniform('uOutlineThickness', 6.0); // Base thickness in pixels
  outlineShaderProgram.setUniform('uEdgeThreshold', 0.4); // Edge detection threshold
  
  // Noise parameters for varying outline thickness
  outlineShaderProgram.setUniform('uNoiseXOffset', 0.0); // X offset for noise
  outlineShaderProgram.setUniform('uNoiseYOffset', 0.0); // Y offset for noise
  outlineShaderProgram.setUniform('uNoiseScaleX', 10.0); // X scale for noise frequency
  outlineShaderProgram.setUniform('uNoiseScaleY', 10.0); // Y scale for noise frequency
  outlineShaderProgram.setUniform('uNoiseWeight', 0.5); // Noise weight (0.0 = no noise, 1.0 = full variation)
  
  model(fullScreenModelData);

}

function draw() {

  // Apply the shader
  // shader(shaderProgram);
  // shaderProgram.setUniform('uMainTexture', photoTexture);
  
  // model(modelData);
  // // Draw the geometry
  // if (modelData) {
  //   model(modelData);
  // }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}