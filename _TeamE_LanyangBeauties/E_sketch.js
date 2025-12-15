// get url parameters
const urlParams = new URLSearchParams(window.location.search);

// const seed = 1234567890;
// const p1 = 0.5;
// const p2 = 0.5;
// const p3 = 0.5;
// const p4 = 0.5;
const seed = urlParams.get("seed") || Math.random() * 100000000;
const p1 = urlParams.get("p1") || Math.random();
const p2 = urlParams.get("p2") || Math.random();
const p3 = urlParams.get("p3") || Math.random();
const p4 = urlParams.get("p4") || Math.random();

// this is a p5js v2 script
let _renderer = null;
let fontResource = null;

// subdivision rect settings
let mainHue = 0;
let maxDepth = 4;
let minDepth = 2;
let splitChance = 0.9;
let rectList = [];

// image settings
let windowDataSetList = [];

// layer buffers
let bufferBGLayer;

let bufferLayerBgMask;
let bufferLayerWindowFrame;
let bufferLayerWindowColor;
let bufferLayerWindowMask;
let bufferEffectResult;

// collager
let collager;
let windowSetIndex = 0;
let windowObjects = [];

async function setup() {
  _renderer = createCanvas(1080, 1920, WEBGL);
  flex();
  fontResource = await loadFont("../fonts/Monospace.ttf");

  randomSeed(seed);
  noiseSeed(seed);

  // set to orthographic projection
  colorMode(HSB);
  rectMode(CENTER);
  imageMode(CENTER);

  // load images
  windowSetIndex = int(random(0, 3));
  await loadWindowImages(windowSetIndex);

  // init buffers
  bufferBGLayer = createFramebuffer();
  bufferLayerBgMask = createFramebuffer();
  bufferLayerBgMask.draw(() => {
    background(0, 0, 100);
  });
  bufferLayerWindowColor = createFramebuffer();
  bufferLayerWindowFrame = createFramebuffer();
  bufferLayerWindowMask = createFramebuffer();
  bufferEffectResult = createFramebuffer();
  bufferLayerWindowMask.draw(() => {
    background(0, 0, 0);
  });

  // init collager
  collager = new Collager();
  await collager.initSystem();

  await collager.addImage("photoImages/demo-01.png", 0.2, 0.8);
  await collager.addImage("photoImages/demo-02.png", 0.2, 0.8);
  await collager.addImage("photoImages/demo-03.png", 0.2, 0.8);
  await collager.addImage("photoImages/demo-04.png", 0.2, 0.8);
  await collager.addImage("photoImages/demo-05.png", 0.2, 0.8);
  await collager.addImage("photoImages/demo-06.png", 0.2, 0.8);

  // some settings
  mainHue = lerp(0, 360, p1);

  // Use p2 to control max depth (complexity)
  maxDepth = floor(lerp(2, 8, p2));

  // Use p4 to control split irregularity (split ratio range)
  // If p4 is 0, split near 0.5. If p4 is 1, split can be 0.1-0.9
  let variation = lerp(0.06, 0.36, p4);
  let splitMin = 0.5 - variation;
  let splitMax = 0.5 + variation;

  minDepth = 2;

  // p3 controls padding?
  let rectPadding = lerp(10, 30, p3);

  background(0, 0, 30);

  // Create Subdivision
  // Start with a rectangle that fills the canvas (or slightly smaller with margin)
  let margin = 50;
  let w = width - margin * 2;
  let h = height - margin * 2;
  // Since we use WEBGL and CENTER mode, center is 0,0.
  // Top-left corner is -w/2, -h/2

  let subdivider = new SubdivisionRect(-w / 2, -h / 2, w, h, {
    minDepth: minDepth,
    maxDepth: maxDepth,
    splitRatioMin: splitMin,
    splitRatioMax: splitMax,
    splitChance: 0.85,
    padding: rectPadding,
    minSize: 100, // Stop splitting if smaller than this
  });

  rectList = subdivider.getLeaves();

  // prepare window
  for (let i = 0; i < rectList.length; i++) {
    let rectData = rectList[i];
    let bestFitWindowData = getClosestWindowData(rectData.w / rectData.h);

    let randomFadeInDelay = random(0, 2000);
    let randomFadeInTime = 6000;

    let windowObject = new WindowObject(rectData, bestFitWindowData, randomFadeInDelay, randomFadeInTime);

    windowObjects.push(windowObject);
  }
  AsyncDrawOnce();
}

function draw() {
  // Empty draw loop as we use AsyncDrawOnce for one-time drawing
}

async function AsyncDrawOnce() {
  background(0, 0, 30);

  noFill();
  stroke(mainHue, 80, 100);
  strokeWeight(2);

  // init window objectData
  // init window objectData
  // init window objectData
  for (let i = 0; i < windowObjects.length; i++) {
    let windowObject = windowObjects[i];
    let imgIndex = int(random(0, 5));
    let randomAngleDegree = random(-30, 30);
    let randomScale = random(1.0, 3.0);
    windowObject.setInsideImage(collager.images[imgIndex], randomScale, randomAngleDegree);
    windowObject.drawObject();
  }

  // draw background
  // draw background
  // draw background
  let pieceCount = random(200, 600);

  for (let i = 0; i < pieceCount; i++) {
    let posX = random(-width / 2, width / 2);
    let posY = random(-height / 2, height / 2);

    let t = i / 600;
    let drawSizeMultiplier = lerp(1.0, 0.2, t);

    let sizeW = random(100, 900) * drawSizeMultiplier;
    let sizeH = random(100, 900) * drawSizeMultiplier;

    let angleDegree = random(-360, 360);

    // color bg layer
    bufferBGLayer.draw(() => {
      noStroke();
      fill(0, 0, 100);
      collager.drawRect(posX, posY, sizeW, sizeH, angleDegree);
    });

    // show bg
    image(bufferBGLayer, 0, 0, width, height);
    await sleep(16);
  }

  // start fading
  for (let i = 0; i < windowObjects.length; i++) {
    let windowObject = windowObjects[i];
    windowObject.startFadeIn();
  }

  startBreathingEffect();
}

let breathingShader = null;
let startTime = null;
let isBreathing = false;
let effectStrength = 0.0;
let effectTimeCounter = 0.0;

async function startBreathingEffect() {
  // do breathing effect
  let fragShaderPath = "";

  if (windowSetIndex == 0) {
    fragShaderPath = "../shaders/effect_E_01.frag";
  } else if (windowSetIndex == 1) {
    fragShaderPath = "../shaders/effect_E_02.frag";
  } else if (windowSetIndex == 2) {
    fragShaderPath = "../shaders/effect_E_03.frag";
  }

  breathingShader = await loadShader("../shaders/uniform.vert", fragShaderPath);

  startTime = millis();
  isBreathing = true;
}

function draw() {
  if (isBreathing) {
    bufferEffectResult.draw(() => {
      shader(breathingShader);
      breathingShader.setUniform("width", 1080.0);
      breathingShader.setUniform("height", 1920.0);
      breathingShader.setUniform("time", (millis() - startTime) / 1000.0);
      breathingShader.setUniform("uresolution", [width, height]);

      breathingShader.setUniform("utexture", bufferBGLayer);
      breathingShader.setUniform("uMaskTexture", bufferLayerBgMask);
      breathingShader.setUniform("uEffectStrength", effectStrength);

      noStroke();
      fill(0, 0, 100);
      rect(0, 0, width, height);

      resetShader();
    });

    // slowly apply the effect
    effectTimeCounter += deltaTime / 3600.0;
    effectStrength = easeInOutSine(constrain(effectTimeCounter, 0.0, 1.0));

    image(bufferEffectResult, 0, 0, width, height);


    // draw and update window objects
    for (let i = 0; i < windowObjects.length; i++) {
      let windowObject = windowObjects[i];
      windowObject.update(deltaTime);
      windowObject.drawObject();

      if (windowObject.canChangeImage) {
        let imgIndex = int(random(0, 5));
        let randomAngleDegree = random(-30, 30);
        let randomScale = random(1.0, 3.0);
        windowObject.setInsideImage(collager.images[imgIndex], randomScale, randomAngleDegree);
      }
    }
  }
}

async function loadWindowImages(_windowSetIndex) {
  if (_windowSetIndex == 0) {
    windowDataSetList.push(
      await WindowDataSet.LoadWindowData(
        "windowImages/window-A-1-1.png",
        "curveData/window-A-1-1.json"
      )
    );
    windowDataSetList.push(
      await WindowDataSet.LoadWindowData(
        "windowImages/window-A-1-2-1.png",
        "curveData/window-A-1-2-1.json"
      )
    );
    windowDataSetList.push(
      await WindowDataSet.LoadWindowData(
        "windowImages/window-A-1-2-2.png",
        "curveData/window-A-1-2-2.json"
      )
    );
    windowDataSetList.push(
      await WindowDataSet.LoadWindowData(
        "windowImages/window-A-1-3-1.png",
        "curveData/window-A-1-3-1.json"
      )
    );
    windowDataSetList.push(
      await WindowDataSet.LoadWindowData(
        "windowImages/window-A-1-3-2.png",
        "curveData/window-A-1-3-2.json"
      )
    );
    windowDataSetList.push(
      await WindowDataSet.LoadWindowData(
        "windowImages/window-A-2-1-2.png",
        "curveData/window-A-2-1-2.json"
      )
    );
    windowDataSetList.push(
      await WindowDataSet.LoadWindowData(
        "windowImages/window-A-2-1.png",
        "curveData/window-A-2-1.json"
      )
    );
    windowDataSetList.push(
      await WindowDataSet.LoadWindowData(
        "windowImages/window-A-3-1-1.png",
        "curveData/window-A-3-1-1.json"
      )
    );
    windowDataSetList.push(
      await WindowDataSet.LoadWindowData(
        "windowImages/window-A-3-1-2.png",
        "curveData/window-A-3-1-2.json"
      )
    );
    windowDataSetList.push(
      await WindowDataSet.LoadWindowData(
        "windowImages/window-A-3-1-3.png",
        "curveData/window-A-3-1-3.json"
      )
    );
  } else if (_windowSetIndex == 1) {
    windowDataSetList.push(
      await WindowDataSet.LoadWindowData(
        "windowImages/window-B-1-1.png",
        "curveData/window-B-1-1.json"
      )
    );
    windowDataSetList.push(
      await WindowDataSet.LoadWindowData(
        "windowImages/window-B-1-2-1.png",
        "curveData/window-B-1-2-1.json"
      )
    );
    windowDataSetList.push(
      await WindowDataSet.LoadWindowData(
        "windowImages/window-B-1-2-2.png",
        "curveData/window-B-1-2-2.json"
      )
    );
    windowDataSetList.push(
      await WindowDataSet.LoadWindowData(
        "windowImages/window-B-1-2-3.png",
        "curveData/window-B-1-2-3.json"
      )
    );
    windowDataSetList.push(
      await WindowDataSet.LoadWindowData(
        "windowImages/window-B-2-1-1.png",
        "curveData/window-B-2-1-1.json"
      )
    );
    windowDataSetList.push(
      await WindowDataSet.LoadWindowData(
        "windowImages/window-B-2-1-2.png",
        "curveData/window-B-2-1-2.json"
      )
    );
  } else if (_windowSetIndex == 2) {
    windowDataSetList.push(
      await WindowDataSet.LoadWindowData(
        "windowImages/window-C-1.png",
        "curveData/window-C-1.json"
      )
    );
    windowDataSetList.push(
      await WindowDataSet.LoadWindowData(
        "windowImages/window-C-2.png",
        "curveData/window-C-2.json"
      )
    );
    windowDataSetList.push(
      await WindowDataSet.LoadWindowData(
        "windowImages/window-C-3.png",
        "curveData/window-C-3.json"
      )
    );
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
