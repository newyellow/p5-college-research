// get url parameters
const urlParams = new URLSearchParams(window.location.search);

const seed = urlParams.get("seed") || Math.random() * 100000000;
const p1 = urlParams.get("p1") || Math.random();
const p2 = urlParams.get("p2") || Math.random();
const p3 = urlParams.get("p3") || Math.random();
const subtype = urlParams.get("subtype") || int(Math.random() * 3);

// this is a p5js v2 script
let _renderer = null;
let fontResource = null;

// buffers
let tempAssetLayer; // use as effect layer later
let tempMaskLayer;
let textLayer;
let textBGLayer;

let mainHue = 0;
let rectBaseSize = 0;
let baseThickness = 0;
let sizeVariation = 0;

let textIndex = 0;

let collager;
let croppedImageContainer = null;

let randonclrpos = [];
let randomGauss = [];

async function setup() {
  _renderer = createCanvas(1080, 1920, WEBGL);
  flex();
  fontResource = await loadFont("../fonts/Monospace.ttf");

  // init buffers
  tempAssetLayer = createFramebuffer();
  tempMaskLayer = createFramebuffer();
  textLayer = createFramebuffer();
  textBGLayer = createFramebuffer();

  // setup random values
  randomSeed(seed);
  noiseSeed(seed);

  mainHue = lerp(0, 360, p1);
  rectBaseSize = lerp(30, 200, p2);
  baseThickness = lerp(1, 10, p3);
  sizeVariation = lerp(0.1, 0.6, p3);

  textIndex = subtype;

    for (let i = 0; i < 6; i++) {
      randonclrpos.push(Math.floor(Math.random() * 3));
    }
    
    for (let i = 0; i < 3; i++) {
      let sign = Math.random() > 0.5 ? 1 : -1;
      let strength = 0.1 + Math.random() * 0.9;
      randomGauss.push(sign * strength);
    }


  // set to orthographic projection
  colorMode(HSB);
  rectMode(CENTER);
  imageMode(CENTER);

  background(0, 0, 30);

  // init systems
  croppedImageContainer = new CroppedImageContainer();

  collager = new Collager();
  await collager.initSystem();

  // load hue
  await loadTextImageSetData(textIndex);

  // draw layer
  await asyncDraw();
}

async function asyncDraw() {
  await prepareMainTextLayer();
  await prepareTextBGLayer();

  await setupLut(textIndex, 1.0);
  await drawSeaWaveLayer();

  collager.clearImages();
  collager.noLut();

  // debugBufferLayers([tempAssetLayer, tempMaskLayer, textLayer, textBGLayer]);
  startBreathingEffect();

  // let greenLut = await loadImage('images/luts/C_lut_green.png');

  // collager.cutoutThickness(0.01);
  // collager.cutoutNoiseScale(0.1);
  // collager.cutoutRatio(0.1, 0.9);

  // collager.outlineWeight(12);
  // collager.outlineNoiseScale(0.36);
  // collager.outlineRatio(0.4, 0.8);

  // collager.shadow(12, -6, 30, [0, 0, 0], 0.3);

  // collager.debug(true);

  // collager.setLutTexture(greenLut);
  // collager.setLutIntensity(1.0);

  // // await collager.addImage('images/artifacts/boat_01.png', 0.2, 0.8);
  // let imgData = await loadImage('images/artifacts/mountain_01.png');
  // let imgPathData = await loadJSON('images/artifacts/mountain_01.json');

  // collager.drawMaskedImage(imgData, imgPathData, 0, 0, 800, 10);;
  // collager.drawRect(0, 0, 300, 300);
}

async function prepareMainTextLayer() {
  let textImagePaths = [
    "images/text_mask_0.png",
    "images/text_mask_1.png",
    "images/text_mask_2.png",
  ];

  let pickedImagePath = textImagePaths[textIndex];
  let textImageData = await loadImage(pickedImagePath);

  // setup lut first
  let lutPath = getLUTPath(p1);
  let lutTexture = await loadImage("../" + lutPath);
  collager.setLutTexture(lutTexture);
  collager.setLutIntensity(1.0);

  // text data
  let textPosX = random(-360, 360);
  let textPosY = random(-360, 100);

  let textSize = random(600, 1600);

  tempMaskLayer.draw(() => {
    background(0);
    image(textImageData, textPosX, textPosY, textSize, textSize);
  });
  image(tempMaskLayer, 0, 0);

  // cancel lut
  collager.cutoutThickness(0.01);
  collager.cutoutNoiseScale(0.1);
  collager.cutoutRatio(0.1, 0.9);

  collager.outlineWeight(16);
  collager.outlineNoiseScale(0.66);

  collager.shadow(12, -6, 30, [0, 0, 0], 0.6);

  let filledObjects = 120;
  for (let i = 0; i < filledObjects; i++) {
    let croppedImgSet = croppedImageContainer.getRandomCroppedImageSet();

    // uniformly distribute points around textPos in a circle with variable radius
    let angle = random(0, TWO_PI);
    let radius = random(0, textSize * 0.5);
    let drawPosX = textPosX + cos(angle) * radius;
    let drawPosY = textPosY + sin(angle) * radius;

    let drawSize = random(textSize * 0.12, textSize * 0.48);
    let drawAngle = random(-180, 180);

    tempAssetLayer.draw(() => {
      collager.drawMaskedImage(
        croppedImgSet.imageData,
        croppedImgSet.curveData,
        drawPosX,
        drawPosY,
        drawSize,
        drawAngle
      );
    });

    image(tempAssetLayer, 0, 0);

    await sleep(16);
  }

  // draw onto the final layer
  let maskTextureShader = await loadShader(
    "../shaders/texture.vert",
    "../shaders/texture_text_mask.frag"
  );

  textLayer.draw(() => {
    shader(maskTextureShader);
    maskTextureShader.setUniform("uMainTexture", tempAssetLayer);
    maskTextureShader.setUniform("uMaskTexture", tempMaskLayer);
    maskTextureShader.setUniform("uTextureScale", [1.0, 1.0]);
    maskTextureShader.setUniform("uTextureOffset", [0.0, 0.0]);

    maskTextureShader.setUniform("uDoInnerShadow", 1);
    maskTextureShader.setUniform("uInnerShadowDistance", 360);
    maskTextureShader.setUniform("uInnerShadowIntensity", 0.66);
    maskTextureShader.setUniform("uMaskTextureSize", [
      tempMaskLayer.width,
      tempMaskLayer.height,
    ]);

    noStroke();
    fill(0, 0, 100);
    rectMode(CENTER);
    rect(0, 0, width, height);
    resetShader();
  });

  // fade in effect
  for (let i = 0; i < 30; i++) {
    let t = i / 30.0;

    noStroke();
    fill(0, 0, 100, 0.1);
    rect(0, 0, width, height);

    tint(0, 0, 100, t);
    image(textLayer, 0, 0);
    await sleep(16);
  }

  background(0, 0, 100);
  image(textLayer, 0, 0);
}

async function prepareTextBGLayer() {
  collager.clearImages();

  textBGLayer.draw(() => {
    background(100);
  });

  tempMaskLayer.draw(() => {
    background(100);
  });

  let bookImgPaths = [
    "images/book_01.png",
    "images/book_02.png",
    "images/book_03.png",
    "images/book_04.png",
    "images/book_05.png",
    "images/book_06.png",
  ];

  // random pick 3
  shuffle(bookImgPaths, true);
  for (let i = 0; i < 3; i++) {
    await collager.addImage(bookImgPaths[i], 0.6, 0.9);
  }

  collager.cutoutThickness(120);
  collager.cutoutNoiseScale(0.6);
  collager.cutoutRatio(0.1, 0.9);

  collager.rectEdgeOffset(60);
  collager.rectRoundness(0);
  collager.rectNoiseScale(0.001);
  collager.rectPointCount(200);

  let pieceCount = 24;

  for (let i = 0; i < pieceCount; i++) {
    let posX = random(-600, 600);
    let posY = random(-600, 600);

    let sizeW = random(600, 1000);
    let sizeH = random(600, 1200);

    textBGLayer.draw(() => {
      collager.drawRect(posX, posY, sizeW, sizeH);
    });

    // redraw mask
    tempMaskLayer.draw(() => {
      tint(0, 0, 0);
      collager.redrawRectOutlineMask(posX, posY, sizeW, sizeH);

      tint(0, 0, 100);
      collager.redrawRectInsideMask(posX, posY, sizeW, sizeH);
    });
  }

  // slowly fade in
  for (let i = 0; i < 30; i++) {
    let t = i / 30.0;
    background(0, 0, 100);
    tint(0, 0, 100, t);
    image(textBGLayer, 0, 0);

    tint(0, 0, 100, 1.0);
    image(textLayer, 0, 0);

    await sleep(16);
  }
}

async function drawSeaWaveLayer() {
  collager.clearImages();

  let texturePaths = [
    "images/wave_textures/sea-paper-1.png",
    "images/wave_textures/sea-paper-2.png",
    "images/wave_textures/sea-paper-3.png",
    "images/wave_textures/sea-paper-4.png",
    "images/wave_textures/sea-paper-5.png",
    "images/wave_textures/sea-paper-6.png",
    "images/wave_textures/sea-paper-7.png",
    "images/wave_textures/sea-paper-8.png",
    "images/wave_textures/sea-paper-9.png",
    "images/wave_textures/sea-paper-10.png",
    "images/wave_textures/sea-paper-11.png",
  ];

  // randomly pick 3
  shuffle(texturePaths, true);

  for (let i = 0; i < 3; i++) {
    await collager.addImage(texturePaths[i], 0.6, 1.0);
  }

  let pieceCount = random(3, 6);

  collager.shadow(12, -6, 30, [0, 0, 0], 0.3);

  // draw some large image
  for (let i = 0; i < pieceCount; i++) {
    // let posX = random(-360, 360);
    let posX = 0;
    let posY = random(-900, 900);

    // let sizeW = random(800, 1200);
    // let sizeH = random(300, 400);
    let sizeW = 1480;
    let sizeH = random(100, 360);

    let rotationDegree = random(-12, 12);

    textBGLayer.draw(() => {
      collager.drawRect(posX, posY, sizeW, sizeH, rotationDegree);
    });

    tempMaskLayer.draw(() => {
      tint(0, 0, 0);
      collager.redrawRectOutlineMask(posX, posY, sizeW, sizeH, rotationDegree);
    });

    // draw all
    background(0, 0, 100);
    image(textBGLayer, 0, 0);
    image(textLayer, 0, 0);
    await sleep(100);
  }
}

async function setupLut(colorIndex, intensity) {
  let lutPaths = [
    "images/luts/C_lut_green.png",
    "images/luts/C_lut_blue.png",
    "images/luts/C_lut_yellow.png",
  ];

  let pickedLutPath = lutPaths[colorIndex];
  let lutData = await loadImage(pickedLutPath);

  collager.setLutTexture(lutData);
  collager.setLutIntensity(intensity);
}

// breathing stuff
let breathingShader = null;
let startTime = null;
let isBreathing = false;
let effectStrength = 0.0;
let effectTimeCounter = 0.0;

async function startBreathingEffect() {
  // do breathing effect
  let fragShaderPath = "";
  fragShaderPath = "../shaders/effect_C.frag";

  breathingShader = await loadShader("../shaders/uniform.vert", fragShaderPath);

  startTime = millis();
  isBreathing = true;
}

function draw() {
  if (isBreathing) {
    tempAssetLayer.draw(() => {
      shader(breathingShader);
      breathingShader.setUniform("width", 1080.0);
      breathingShader.setUniform("height", 1920.0);
      breathingShader.setUniform("time", (millis() - startTime) / 1000.0);
      breathingShader.setUniform("uresolution", [width, height]);

      breathingShader.setUniform("utexture", textBGLayer);
      breathingShader.setUniform("uMaskTexture", tempMaskLayer);
      breathingShader.setUniform("uEffectStrength", effectStrength);

      breathingShader.setUniform("uColorMode", textIndex);
      breathingShader.setUniform("rand", randonclrpos);
      breathingShader.setUniform("gauss", randomGauss);
      
      noStroke();
      fill(0, 0, 100);
      rect(0, 0, width, height);

      resetShader();
    });

    // slowly apply the effect
    effectTimeCounter += deltaTime / 2400.0;
    effectStrength = easeInOutSine(constrain(effectTimeCounter, 0.0, 1.0));

    image(tempAssetLayer, 0, 0, width, height);
    image(textLayer, 0, 0, width, height);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadTextImageSetData(_textIndex) {
  if (_textIndex == 0) {
    // mountain
    await croppedImageContainer.addImage(
      "images/artifacts/stone_01.png",
      "images/artifacts/stone_01.json"
    );
    await croppedImageContainer.addImage(
      "images/artifacts/stone_02.png",
      "images/artifacts/stone_02.json"
    );
    await croppedImageContainer.addImage(
      "images/artifacts/stone_03.png",
      "images/artifacts/stone_03.json"
    );
    await croppedImageContainer.addImage(
      "images/artifacts/stone_04.png",
      "images/artifacts/stone_04.json"
    );
  } else if (_textIndex == 1) {
    // sea
    await croppedImageContainer.addImage(
      "images/artifacts/blue_artifact_01.png",
      "images/artifacts/blue_artifact_01.json"
    );
    await croppedImageContainer.addImage(
      "images/artifacts/blue_artifact_02.png",
      "images/artifacts/blue_artifact_02.json"
    );
    await croppedImageContainer.addImage(
      "images/artifacts/blue_artifact_03.png",
      "images/artifacts/blue_artifact_03.json"
    );
  } else if (_textIndex == 2) {
    // human
    await croppedImageContainer.addImage(
      "images/artifacts/skeleton_01.png",
      "images/artifacts/skeleton_01.json"
    );
    await croppedImageContainer.addImage(
      "images/artifacts/skeleton_02.png",
      "images/artifacts/skeleton_02.json"
    );
    await croppedImageContainer.addImage(
      "images/artifacts/skeleton_03.png",
      "images/artifacts/skeleton_03.json"
    );
    await croppedImageContainer.addImage(
      "images/artifacts/skeleton_04.png",
      "images/artifacts/skeleton_04.json"
    );
  }
}
