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

// collager
let collager;


let mainHue = 0;
let rectBaseSize = 0;
let baseThickness = 0;
let sizeVariation = 0;

let layerBg;
let layerBottleStroke;
let layerBottleInner;
let layerBottleHole;
let layerBreathingMask;

async function setup() {
  _renderer = createCanvas(1080, 1920, WEBGL);
  fontResource = await loadFont('../fonts/Monospace.ttf');
  frameRate(60);
  colorMode(HSB);

  background(0);

  randomSeed(seed);
  noiseSeed(seed);

  layerBg = createGraphics(width, height, WEBGL);
  layerBottleStroke = createGraphics(width, height, WEBGL);
  layerBottleInner = createGraphics(width, height, WEBGL);
  layerBottleHole = createGraphics(width, height, WEBGL);
  layerBreathingMask = createGraphics(width, height, WEBGL);

  let bottleIndex = random(0, 3);

  // init collager
  collager = new Collager();
  await collager.initSystem();

  drawBottleA();

}


async function drawBottleA() {
  // load bg materials
  await collager.addImage('images/A_bg.jpg', 0.2, 0.4);

  await loadBottleACurve();

  maskBottleBG();

  background(0, 0, 0);

  let pieceCount = 2000;

  // bg collager settings
  collager.cutoutThickness(30);
  collager.cutoutNoiseScale(0.1);

  collager.outlineWeight(120);
  collager.outlineNoiseScale(0.6);
  collager.outlineRatio(0.1, 0.9);

  collager.rectRoundness(random(0, 60));
  collager.rectPointCount(floor(random(10, 60)));
  collager.rectNoiseScale(0.036);
  collager.rectEdgeOffset(30);

  collager.shadow(10, 10, 12, [0, 0, 0], 0.4);

  // set bg layer
  collager.setTargetGraphics(layerBg);

  for (let i = 0; i < pieceCount; i++) {
    let posX = random(-width / 2, width / 2);
    let posY = random(-height / 2, height / 2);

    let sizeX = random(100, 300);
    let sizeY = random(100, 300);

    let angleDegree = random(-180, 180);

    let shadowOffset = random(3, 12);
    collager.shadowOffset(shadowOffset, shadowOffset);

    collager.drawRect(posX, posY, sizeX, sizeY, angleDegree);

    if (i % 6 == 0)
      await sleep(16);
  }
}

function draw() {
  background(0);

  image(layerBg, 0, 0);
  image(layerBottleInner, 0, 0);
  image(layerBottleHole, 0, 0);
  image(layerBottleStroke, 0, 0);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
