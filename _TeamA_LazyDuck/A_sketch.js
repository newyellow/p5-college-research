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

async function setup() {
  _renderer = createCanvas(1080, 1920, WEBGL);
  flex();
  fontResource = await loadFont('../fonts/Monospace.ttf');

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
}

function draw() {

  // print parameters on the screen
  fill(0, 0, 100);
  textSize(36); 
  textFont(fontResource);
  text(`seed: ${seed}`, -400, -800);
  text(`p1: ${p1}`, -400, -750);
  text(`p2: ${p2}`, -400, -700);
  text(`p3: ${p3}`, -400, -650);
  text(`p4: ${p4}`, -400, -600);

  let posX = random(-width / 2, width / 2);
  let posY = random(-height / 2, height / 2);

  let sizeX = rectBaseSize * random(1 - sizeVariation, 1 + sizeVariation);
  let sizeY = rectBaseSize * random(1 - sizeVariation, 1 + sizeVariation);

  let colorHue = (mainHue + random(-30, 30) + 360) % 360;
  let colorSat = random(40, 60);
  let colorBri = random(80, 100);
  fill(colorHue, colorSat, colorBri);
  rect(posX, posY, sizeX, sizeY);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
