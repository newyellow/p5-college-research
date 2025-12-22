// get url parameters
const urlParams = new URLSearchParams(window.location.search);

const seed = urlParams.get("seed") || Math.random() * 100000000;
const p1 = parseFloat(urlParams.get("p1") || Math.random());
const p2 = parseFloat(urlParams.get("p2") || Math.random());
const p3 = parseFloat(urlParams.get("p3") || Math.random());

// Density and chaos multipliers
const p2AmountMult = 0.3 + (0.7 * p2 / 0.6);
const p2SizeMult = 1.7 - (0.7 * p2 / 0.6);
const p3RotRange = 6 + (360 - 6) * p3;
const p3SizeVarMin = 1.0 - 0.6 * p3;
const p3SizeVarMax = 1.0 + 0.6 * p3;
const subtype = parseInt(urlParams.get("subtype") || (Math.random() * 3));

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
let imageLoadLimit = 4; // limit loading image count

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

  // Show loading text
  colorMode(HSB);
  background(0, 0, 0);
  fill(0, 0, 100);
  noStroke();
  textFont(fontResource);
  textSize(32);
  textAlign(CENTER, CENTER);
  text("loading images ...", 0, 0);

  seedPRNG(seed);

  // set to orthographic projection
  rectMode(CENTER);
  imageMode(CENTER);

  // load images
  windowSetIndex = subtype;
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

  let lutPath = getLUTPath(p1);
  let lutTexture = await loadImage("../" + lutPath);
  collager.setLutTexture(lutTexture);
  collager.setLutIntensity(1.0);



  // some settings
  mainHue = lerp(0, 360, p1);

  // Use p2 to control max depth (complexity)
  maxDepth = floor(lerp(2, 8, p2));

  // Use p4 to control split irregularity (split ratio range)
  // If p4 is 0, split near 0.5. If p4 is 1, split can be 0.1-0.9
  let variation = lerp(0.06, 0.36, p3);
  let splitMin = 0.5 - variation;
  let splitMax = 0.5 + variation;

  minDepth = 2;

  // p3 controls padding?
  let rectPadding = lerp(10, 30, p3);

  background(0, 0, 0);

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

async function AsyncDrawOnce() {
  background(0, 0, 0);

  noFill();
  stroke(mainHue, 80, 100);
  strokeWeight(2);

  // init window objectData
  // init window objectData
  // init window objectData
  for (let i = 0; i < windowObjects.length; i++) {
    let windowObject = windowObjects[i];
    let imgIndex = int(random(0, collager.images.length));
    let randomAngleDegree = random(-30, 30);
    let randomScale = random(1.0, 3.0);
    windowObject.setInsideImage(collager.images[imgIndex], randomScale, randomAngleDegree);
    windowObject.drawObject();
  }

  // draw background
  // draw background
  // draw background
  await loadBackgroundImages(windowSetIndex);

  let pieceCount = random(200, 600) * p2AmountMult;

  for (let i = 0; i < pieceCount; i++) {
    let posX = random(-width / 2, width / 2);
    let posY = random(-height / 2, height / 2);

    let t = i / pieceCount;
    let drawSizeMultiplier = lerp(1.0, 0.2, t);

    let sizeW = random(100, 900) * drawSizeMultiplier * p2SizeMult * random(p3SizeVarMin, p3SizeVarMax);
    let sizeH = random(100, 900) * drawSizeMultiplier * p2SizeMult * random(p3SizeVarMin, p3SizeVarMax);

    let angleDegree = random(-p3RotRange, p3RotRange);

    // color bg layer
    bufferBGLayer.draw(() => {
      noStroke();
      fill(0, 0, 100);
      collager.drawRect(posX, posY, sizeW, sizeH, angleDegree);
    });

    // show bg
    image(bufferBGLayer, 0, 0, width, height);
    await collager.sync();
  }

  await loadWindowInsideImages(windowSetIndex);

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
        
        let imgIndex = int(random(0, collager.images.length));
        let randomAngleDegree = random(-30, 30);
        let randomScale = random(1.0, 3.0);
        windowObject.setInsideImage(collager.images[imgIndex], randomScale, randomAngleDegree);
      }
    }
  }
}

async function loadBackgroundImages(_setIndex) {
  let imagePool = [];
  if (_setIndex == 0) // good old times
  {
    imagePool = [
      'photoImages/village_01.jpeg',
      'photoImages/village_02.jpeg',
      'photoImages/village_03.jpeg',
      'photoImages/village_04.jpeg',
      'photoImages/village_05.jpeg',
      'photoImages/village_06.jpeg',
      'photoImages/village_07.jpeg',
      'photoImages/village_08.jpeg',
      'photoImages/village_09.jpeg',
      'photoImages/village_10.jpeg',
      'photoImages/village_11.jpeg'
    ];
  }
  else if (_setIndex == 1) // modern times
  {
    imagePool = [
      'photoImages/road_01.jpeg',
      'photoImages/road_02.jpeg',
      'photoImages/road_04.jpeg',
      'photoImages/road_05.jpeg',
      'photoImages/road_06.jpeg'
    ];
  }
  else if (_setIndex == 2) // future times
  {
    imagePool = [
      'photoImages/tech_01.jpeg',
      'photoImages/tech_02.jpeg',
      'photoImages/tech_03.jpeg',
      'photoImages/tech_04.jpeg',
      'photoImages/tech_05.jpeg',
      'photoImages/tech_06.jpeg'
    ];
  }

  let selectedImages = shuffle(imagePool).slice(0, imageLoadLimit);
  for (let img of selectedImages) {
    await collager.addImage(img, 0.3, 0.6);
  }
}

async function loadWindowInsideImages(_setIndex) {
  let imagePool = [];
  if (_setIndex == 0) // good old times
  {
    imagePool = [
      'photoImages/old_01.jpeg',
      'photoImages/old_02.jpeg',
      'photoImages/old_03.jpeg',
      'photoImages/old_04.jpeg',
      'photoImages/old_05.jpeg',
      'photoImages/old_06.jpeg',
      'photoImages/old_07.jpeg',
      'photoImages/old_08.jpeg',
      'photoImages/old_09.jpeg'
    ];
  }
  else if (_setIndex == 1) // modern times
  {
    imagePool = [
      'photoImages/now_01.png',
      'photoImages/now_03.jpeg',
      'photoImages/now_04.jpeg',
      'photoImages/now_05.jpeg',
      'photoImages/now_06.jpeg',
      'photoImages/now_07.jpeg',
      'photoImages/now_08.jpeg'
    ];
  }
  else if (_setIndex == 2) // future times
  {
    imagePool = [
      'photoImages/future_01.jpeg',
      'photoImages/future_02.jpeg',
      'photoImages/future_03.jpeg',
      'photoImages/future_04.jpeg',
      'photoImages/future_05.jpeg',
      'photoImages/future_06.jpeg',
      'photoImages/future_07.jpeg',
      'photoImages/future_08.jpeg',
      'photoImages/future_09.jpeg'
    ];
  }

  // Artifacts pool: pick 3 randomly for every generation
  let artifactPool = [
    'photoImages/artstone_01.jpg',
    'photoImages/bowl_01.jpg',
    'photoImages/bowl_02.jpg',
    'photoImages/bowl_03.jpg',
    'photoImages/mountain_01.jpg',
    'photoImages/mountain_02.jpg',
    'photoImages/boat_01.jpg'
  ];
  let selectedArtifacts = shuffle(artifactPool).slice(0, 3);
  for (let img of selectedArtifacts) {
    await collager.addImage(img, 0.36, 0.66);
  }

  let selectedImages = shuffle(imagePool).slice(0, imageLoadLimit);
  for (let img of selectedImages) {
    await collager.addImage(img, 0.24, 0.66);
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
