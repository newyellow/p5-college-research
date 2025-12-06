// this is a p5js v2 script
let _renderer = null;

let modelData = null;
let fullScreenModel = null;
let fullScreenModelData = null;

let shaderProgram;
let outlineShaderProgram;
let shadowShaderProgram;

let photoTexture = null;
let transparentTexture = null;


let collager = null;

async function setup() {
  _renderer = createCanvas(1080, 1920, WEBGL);

  // set to orthographic projection
  colorMode(HSB);
  rectMode(CENTER);
  imageMode(CENTER);

  background(0, 0, 30);

}

function draw() {
  let posX = random(-width / 2, width / 2);
  let posY = random(-height / 2, height / 2);

  let sizeX = random(30, 400);
  let sizeY = random(30, 400);

  fill(random(0, 360), 80, 100);
  rect(posX, posY, sizeX, sizeY);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
