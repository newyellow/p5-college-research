// get url parameters
const urlParams = new URLSearchParams(window.location.search);

const seed = urlParams.get('seed') || Math.random() * 100000000;
const p1 = urlParams.get('p1') || Math.random();
const p2 = urlParams.get('p2') || Math.random();
const p3 = urlParams.get('p3') || Math.random();
const p4 = urlParams.get('p4') || Math.random();

// this is a p5js v2 script
let _renderer = null;
let fontResource = null;

let mainHue = 0;
let rectBaseSize = 0;
let baseThickness = 0;
let sizeVariation = 0;

let collager;

async function setup() {
  _renderer = createCanvas(1080, 1920, WEBGL);
  flex();
  fontResource = await loadFont('../fonts/Monospace.ttf');

  // init buffers


  // setup random values
  randomSeed(seed);
  noiseSeed(seed);

  mainHue = lerp(0, 360, p1);
  rectBaseSize = lerp(30, 200, p2);
  baseThickness = lerp(1, 10, p3);
  sizeVariation = lerp(0.1, 0.6, p4);

  // set to orthographic projection
  colorMode(HSB);
  rectMode(CENTER);
  imageMode(CENTER);

  background(0, 0, 30);

  collager = new Collager();
  await collager.initSystem();

  // draw layer
  await asyncDraw();
}

async function asyncDraw() {

  collager.cutoutThickness(0);
  collager.cutoutNoiseScale(0.1);
  collager.cutoutRatio(0.1, 0.9);

  collager.outlineWeight(30);
  collager.outlineNoiseScale(0.36);
  collager.outlineRatio(0.2, 0.8);

  collager.debug(true);


  // await collager.addImage('images/artifacts/boat_01.png', 0.2, 0.8);
  let imgData = await loadImage('images/artifacts/mountain_01.png');
  let imgPathData = await loadJSON('images/artifacts/mountain_01.json');


  collager.drawMaskedImage(imgData, imgPathData, 0, 0, 300);;
  // collager.drawRect(0, 0, 300, 300);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
