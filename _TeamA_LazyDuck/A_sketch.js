// get url parameters
const urlParams = new URLSearchParams(window.location.search);

const seed = urlParams.get('seed') || Math.random() * 100000000;
const p1 = parseFloat(urlParams.get('p1') || Math.random());
const p2 = parseFloat(urlParams.get('p2') || Math.random());
const p3 = parseFloat(urlParams.get('p3') || Math.random());
const p4 = parseFloat(urlParams.get('p4') || Math.random());

// this is a p5js v2 script
let _renderer = null;
let fontResource = null;

// for creating breathing effect
let bufferLayerColorful;
let bufferLayerMask;
let INCLUDE_OUTLINE_IN_MASK = false;


let mainHue = 0;
let rectBaseSize = 0;
let baseThickness = 0;
let sizeVariation = 0;

async function setup() {
  _renderer = createCanvas(1080, 1920, WEBGL);
  flex();
  fontResource = await loadFont('../fonts/Monospace.ttf');

  // init buffers
  bufferLayerColorful = createFramebuffer();
  bufferLayerMask = createFramebuffer();


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

  // draw layer
  await asyncDraw();
}

async function asyncDraw() {

  colorMode(HSB);
  rectMode(CENTER);
  imageMode(CENTER);
  background(0, 0, 20);

  // Initialize Collager
  let collager = new Collager();
  await collager.initSystem();

  // set lut according to p1
  let lutPath = getLUTPath(p1);
  let lutTexture = await loadImage("../" + lutPath);
  collager.setLutTexture(lutTexture);
  collager.setLutIntensity(1.0);

  // Add images
  await collager.addImage('images/sky_01.png', 0.1, 0.6);
  await collager.addImage('images/sky_02_temp.jpg', 0.1, 0.3);

  // outline settings
  collager.cutoutThickness(20);
  collager.cutoutNoiseScale(0.24);
  collager.cutoutRatio(0.0, 1.0);

  // collager.outlineWeight(1);
  collager.outlineWeight(0);
  collager.outlineRatio(0.1, 0.9);
  collager.outlineNoiseScale(6.0);

  // rect drawing settings
  collager.rectEdgeOffset(10);
  collager.rectRoundness(0);
  collager.rectNoiseScale(0.03);
  collager.rectPointCount(24);

  collager.shadow(10, 10, 30, [0, 0, 0], 0.3);

  // Enable debug mode
  collager.debug(false);
  collager.debugScale(0.25);

  let skyRotationNoiseScale = random(0.0001, 0.0012);
  // Draw Rects
  let flowFieldsCount = 2000;
  for (let i = 0; i < flowFieldsCount; i++) {
    let posX = random(-width / 2 - 100, width / 2 + 100);
    let posY = random(-height / 2 - 100, 200);

    let sizeW = random(120, 240);
    let sizeH = random(20, 40);

    let angleNoise = noise(posX * skyRotationNoiseScale, posY * skyRotationNoiseScale, 666.0);
    let angleDegree = lerp(-360, 360, angleNoise);


    collager.drawRect(posX, posY, sizeW, sizeH, angleDegree);

    // draw on color
    bufferLayerColorful.draw(() => {
      collager.redrawRect(posX, posY, sizeW, sizeH, angleDegree);
    });

    bufferLayerMask.draw(() => {
      colorMode(RGB);
      tint(0, 0, 0);
      collager.redrawRectOutlineMask(posX, posY, sizeW, sizeH, angleDegree);

      let drawInMask = random(0, 1) < 0.12;
      if (drawInMask) {
        tint(255, random(0, 255), 255);
        collager.redrawRectInsideMask(posX, posY, sizeW, sizeH, angleDegree);
      }
    });


    if (i % 10 == 0) {
      await sleep(16);
    }
  }


  // draw mountains
  collager.clearImages();
  await collager.addImage('images/train_01.jpg', 0.2, 0.6);
  await collager.addImage('images/train_02.jpg', 0.2, 0.6);

  collager.cutoutThickness(200);
  collager.cutoutNoiseScale(0.6);
  collager.cutoutRatio(0.2, 0.8);

  collager.outlineWeight(100);
  collager.outlineNoiseScale(0.018);
  collager.outlineRatio(0.3, 0.7);


  let mountainLayerCount = 24;
  let xSamplePoints = 10;

  let mountainHeightRange = [60, 666];
  let mountainHeightNoiseScaleX = 0.002;
  let mountainHeightNoiseScaleY = 0.036;

  let mountainLayerOffset = 80;

  let yStart = 0;

  for (let y = 0; y < mountainLayerCount; y++) {
    yStart += mountainLayerOffset * random(0.2, 1.0);

    let mountainUpperPoints = [];
    let mountainLowerPoints = [];

    let xStart = -0.6 * width;
    let xEnd = 0.6 * width;

    let xStep = width / xSamplePoints;

    for (let x = 0; x < xSamplePoints; x++) {
      let xt = x / (xSamplePoints - 1);

      let xPos = lerp(xStart, xEnd, xt) + random(-0.1, 0.1) * xStep;
      let yPos = yStart;

      let heightNoiseValue = noise(xPos * mountainHeightNoiseScaleX, yPos * mountainHeightNoiseScaleY, 1234);
      let mountainAddHeight = lerp(mountainHeightRange[0], mountainHeightRange[1], heightNoiseValue);

      let botXPos = lerp(xStart, xEnd, xt) + random(-0.1, 0.1) * xStep;
      let botYPos = yStart;

      let botNoiseValue = noise(botXPos * mountainHeightNoiseScaleX, botYPos * mountainHeightNoiseScaleY, 1234);
      let botAddHeight = lerp(mountainHeightRange[0] * 0.2, mountainHeightRange[1] * 0.2, botNoiseValue);

      yPos -= mountainAddHeight;
      botYPos += botAddHeight;

      mountainUpperPoints.push(new NYPoint(xPos, yPos));
      mountainLowerPoints.push(new NYPoint(botXPos, botYPos));
    }

    // build clockwise array
    let mountainPoints = [];
    mountainPoints.push(...mountainUpperPoints);
    mountainPoints.push(...mountainLowerPoints.reverse());

    // let drawInMask = random(0, 1) < 0.3;
    // collager.outlineInMask(!drawInMask || INCLUDE_OUTLINE_IN_MASK);

    collager.drawVertexShape(mountainPoints);

    // draw on color
    bufferLayerColorful.draw(() => {
      collager.redrawVertexShape();
    });

    bufferLayerMask.draw(() => {
      colorMode(RGB);
      tint(0, 0, 0);
      collager.redrawVertexShapeOutlineMask();

      let drawInMask = random(0, 1) < 0.48;

      if (drawInMask) {
        tint(255, random(0, 255), 255);
        collager.redrawVertexShapeInsideMask();
      }
    })

    await sleep(100);
  }

  // do breathing effect
  let breathingShader = await loadShader(
    "../shaders/uniform.vert",
    "../shaders/effect_02.frag"
  );

  let startTime = millis();

  let effectTimeCounter = 0;
  let effectStrength = 0.0;

  // loop draw
  while (true) {
    push();
    shader(breathingShader);
    breathingShader.setUniform("width", 1080.0);
    breathingShader.setUniform("height", 1920.0);
    breathingShader.setUniform("time", (millis() - startTime) / 1000.0);
    breathingShader.setUniform("uresolution", [width, height]);

    breathingShader.setUniform("utexture", bufferLayerColorful);
    breathingShader.setUniform("uMaskTexture", bufferLayerMask);
    breathingShader.setUniform("flipV", true);
    breathingShader.setUniform("uEffectStrength", effectStrength);

    noStroke();
    rect(0, 0, width, height);
    resetShader();
    pop();


    effectStrength = easeInOutSine(constrain(effectTimeCounter, 0.0, 1.0));
    effectTimeCounter += 0.016;

    await sleep(16);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
