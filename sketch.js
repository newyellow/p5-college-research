// this is a p5js v2 script
let _renderer = null;

let modelData = null;
let shaderProgram;

let photoTexture = null;


async function setup() {
  _renderer = createCanvas(1080, 1920, WEBGL);

  flex();
  background(30);

  photoTexture = await loadImage('images/test-photo.jpg');

  // Load the shader
  shaderProgram = await loadShader('shader.vert', 'shader.frag');


  let newModel = new NYModel('test');
  newModel.addTriangle(0, 0, 300, 0, 0, 300);
  modelData = newModel.build(_renderer);

  // console.log(modelData);
}

function draw() {

  // Apply the shader
  shader(shaderProgram);
  shaderProgram.setUniform('uMainTexture', photoTexture);
  
  model(modelData);
  // // Draw the geometry
  // if (modelData) {
  //   model(modelData);
  // }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}