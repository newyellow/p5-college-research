// get url parameters
const urlParams = new URLSearchParams(window.location.search);

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
let bufferColorBg;

let bufferLayerBgMask;
let bufferLayerWindowFrame;
let bufferLayerWindowColor;
let bufferLayerWindowMask;
let bufferEffectResult;

// collager
let collager;

let windowSetIndex = 0;

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
  bufferColorBg = createFramebuffer();
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

  // draw all background
  let pieceCount = random(100, 600);

  for (let i = 0; i < pieceCount; i++) {
    let posX = random(-width / 2, width / 2);
    let posY = random(-height / 2, height / 2);

    let sizeW = random(100, 900);
    let sizeH = random(100, 900);

    let angleDegree = random(-360, 360);

    noStroke();
    fill(0, 0, 100);
    collager.drawRect(posX, posY, sizeW, sizeH, angleDegree);

    await sleep(16);
  }

  // Draw all rectangles
  for (let r of rectList) {
    rectMode(CENTER);

    // Find best image
    let rectAspectRatio = r.w / r.h; // Note: w and h are full size, aspect ratio is same regardless of padding usually, but image draw will respect padding
    let bestData = getClosestWindowData(rectAspectRatio);

    // draw window frame
    noStroke();
    fill(0, 0, 100);
    r.drawImage(bestData.imageData);

    // draw on bg mask
    bufferLayerBgMask.draw(() => {
      erase();
      r.drawCurve(bestData.curveReader);
      noErase();
    });

    // draw on window inside mask
    bufferLayerWindowMask.draw(() => {
      noStroke();
      fill(0, 0, 100);
      r.drawCurve(bestData.curveReader);
    });

    // draw window frame on layer
    bufferLayerWindowColor.draw(() => {
      noStroke();

      let pieceCount = random(6, 12);

      for (let i = 0; i < pieceCount; i++) {
        // let posX = r.x + random(-r.w / 2, r.w / 2) * 0.66;
        // let posY = r.y + random(-r.h / 2, r.h / 2) * 0.66;
        let posX = r.x + r.w / 2 + random(-r.w / 2, r.w / 2);
        let posY = r.y + r.h / 2 + random(-r.h / 2, r.h / 2);

        let sizeW = random(0.6, 1.2) * r.w;
        let sizeH = random(0.6, 1.2) * r.h;

        let angleDegree = random(-20, 20);

        collager.drawRect(posX, posY, sizeW, sizeH, angleDegree);
      }
    });

    bufferLayerWindowFrame.draw(() => {
      noStroke();

      r.drawImage(bestData.imageData);
    });

    await sleep(16);
  }

  startBreathingEffect();
}

let breathingShader = null;
let startTime = null;
let isBreathing = false;

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

      breathingShader.setUniform("utexture", bufferLayerWindowColor);
      breathingShader.setUniform("uMaskTexture", bufferLayerBgMask);

      noStroke();
      fill(0, 0, 100);
      rect(0, 0, width, height);

      resetShader();
    });

    image(bufferEffectResult, 0, 0, width, height);
    image(bufferLayerWindowFrame, 0, 0, width, height);

    // debug
    // image(bufferLayerWindowColor, 0, 0, 400, 600);
    // image(bufferLayerWindowMask, 400, 0, 400, 600);
    // image(bufferLayerWindowFrame, 0, 600, 400, 600);
    // image(bufferEffectResult, 400, 600, 400, 600);
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
