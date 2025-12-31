// get url parameters
const urlParams = new URLSearchParams(window.location.search);

const seed = urlParams.get("seed") || Math.random() * 100000000;
const p1 = parseFloat(urlParams.get("p1") || Math.random());
const p2 = parseFloat(urlParams.get("p2") || Math.random());
const p3 = parseFloat(urlParams.get("p3") || Math.random());

// Density and chaos multipliers
const p2AmountMult = 0.3 + (0.9 * p2 / 0.6);
const p2SizeMult = 1.7 - (0.7 * p2 / 0.6);
const p3RotRange = 6 + (360 - 6) * p3;
const p3SizeVarMin = 1.0 - 0.4 * p3;
const p3SizeVarMax = 1.0 + 0.4 * p3;
const subtype = parseInt(urlParams.get("subtype") || (Math.random() * 3));

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

let shaderPath;

const density = urlParams.get('density') || 1;

async function setup() {
  _renderer = createCanvas(1080, 1920, WEBGL);
  pixelDensity(parseFloat(density));
  flex();
  fontResource = await loadFont("../fonts/Monospace.ttf");

  // init buffers
  tempAssetLayer = createFramebuffer();
  tempMaskLayer = createFramebuffer();
  textLayer = createFramebuffer();
  textBGLayer = createFramebuffer();

  // setup random values
  seedPRNG(seed);

  mainHue = lerp(0, 360, p1);
  rectBaseSize = lerp(30, 200, p2);
  baseThickness = lerp(1, 10, p3);
  sizeVariation = lerp(0.1, 0.6, p3);

  textIndex = subtype;

  for (let i = 0; i < 6; i++) {
    randonclrpos.push(floor(random() * 3));
  }

  for (let i = 0; i < 3; i++) {
    let sign = random() > 0.5 ? 1 : -1;
    let strength = 0.1 + random() * 0.9;
    randomGauss.push(sign * strength);
  }

  // setup shader type
  let randomValue = random();
  let randomShaderType = 0;

  // map to index is easier for testing
  if (randomValue < 0.35) {
    randomShaderType = 0;
  } else if (randomValue < 0.80) {
    randomShaderType = 1;
  } else {
    randomShaderType = 2;
  }

  if (randomShaderType == 0) {
    // 35% mix
    shaderPath = "../shaders/effect_C.frag";
  } else if (randomShaderType == 1) {
    // 45% 波紋
    shaderPath = "../shaders/effect_C_01.frag";
  } else {
    // 20% 純紙
    shaderPath = "../shaders/effect_C_02.frag";
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

  let filledObjects = 120 * p2AmountMult;
  for (let i = 0; i < filledObjects; i++) {
    let croppedImgSet = croppedImageContainer.getRandomCroppedImageSet();

    // uniformly distribute points around textPos in a circle with variable radius
    let angle = random(0, TWO_PI);
    let radius = random(0, textSize * 0.5);
    let drawPosX = textPosX + cos(angle) * radius;
    let drawPosY = textPosY + sin(angle) * radius;

    let drawSize = random(textSize * 0.12, textSize * 0.48) * p2SizeMult * random(p3SizeVarMin, p3SizeVarMax);
    let drawAngle = random(-p3RotRange, p3RotRange);

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

    await collager.sync();
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
    await collager.sync();
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

  let pieceCount = lerp(12, 80, p2);

  for (let i = 0; i < pieceCount; i++) {
    let posX = random(-600, 600);
    let posY = random(-1100, 1100);

    let sizeW = random(600, 1000) * lerp(1.2, 0.36, p2) * random(p3SizeVarMin, p3SizeVarMax);
    let sizeH = random(600, 1200) * lerp(1.2, 0.36, p2) * random(p3SizeVarMin, p3SizeVarMax);
    let drawAngle = random(-p3RotRange, p3RotRange);

    textBGLayer.draw(() => {
      collager.drawRect(posX, posY, sizeW, sizeH, drawAngle);
    });

    // redraw mask
    tempMaskLayer.draw(() => {
      tint(0, 0, 0);
      collager.redrawRectOutlineMask(posX, posY, sizeW, sizeH, drawAngle);

      tint(0, 0, 100);
      collager.redrawRectInsideMask(posX, posY, sizeW, sizeH, drawAngle);
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

    await collager.sync();
  }
}

async function drawSeaWaveLayer() {
  collager.clearImages();

  // Load subtype-specific artifacts and keep their indices
  let artifactIndices = [];
  if (textIndex == 0) {
    // subtype 0: mountains
    await croppedImageContainer.addImage(
      "images/artifacts/mountain_01.png",
      "images/artifacts/mountain_01.json"
    );
    artifactIndices.push(croppedImageContainer.croppedImageSets.length - 1);
    await croppedImageContainer.addImage(
      "images/artifacts/mountain_02.png",
      "images/artifacts/mountain_02.json"
    );
    artifactIndices.push(croppedImageContainer.croppedImageSets.length - 1);
  } else if (textIndex == 1) {
    // subtype 1: blue_artifacts
    let blueArtifacts = [
      "images/artifacts/blue_artifact_01.png",
      "images/artifacts/blue_artifact_02.png",
      "images/artifacts/blue_artifact_03.png"
    ];
    for (let path of blueArtifacts) {
      await croppedImageContainer.addImage(path, path.replace(".png", ".json"));
      artifactIndices.push(croppedImageContainer.croppedImageSets.length - 1);
    }
  } else if (textIndex == 2) {
    // subtype 2: boats
    let boatImages = [
      "images/artifacts/boat_01.png",
      "images/artifacts/boat_02.png",
      "images/artifacts/boat_03.png",
      "images/artifacts/boat_04.png",
      "images/artifacts/ship_01.png",
      "images/artifacts/ship_02.png"
    ];
    for (let path of boatImages) {
      await croppedImageContainer.addImage(path, path.replace(".png", ".json"));
      artifactIndices.push(croppedImageContainer.croppedImageSets.length - 1);
    }
  }

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

  collager.cutoutThickness(10);
  collager.cutoutNoiseScale(0.3);
  collager.cutoutRatio(0.2, 0.8);

  let waveOutlineThickness = lerp(12, 60, p3);
  collager.outlineWeight(waveOutlineThickness);
  collager.outlineRatio(0.2, 0.8);
  collager.outlineNoiseScale(0.01);

  collager.shadow(12, -6, 30, [0, 0, 0], 0.3);

  // draw some large image (thick pieces)
  let thickPieceCount = random(3, 6) * p2AmountMult;

  // Set thicker settings for these pieces
  collager.cutoutThickness(120);
  collager.cutoutNoiseScale(0.6);
  collager.rectEdgeOffset(60);
  collager.rectPointCount(200);

  for (let i = 0; i < thickPieceCount; i++) {
    let posX = 0;
    let posY = random(-900, 900);
    let sizeW = 1480;
    let sizeH = random(100, 360) * p2SizeMult * random(p3SizeVarMin, p3SizeVarMax);
    let rotationDegree = random(-p3RotRange, p3RotRange);

    textBGLayer.draw(() => {
      collager.drawRect(posX, posY, sizeW, sizeH, rotationDegree);
    });
    await collager.sync();

    tempMaskLayer.draw(() => {
      tint(0, 0, 0);
      collager.redrawRectOutlineMask(posX, posY, sizeW, sizeH, rotationDegree);
    });
    await collager.sync();
  }

  // Restore wave settings for the line layers
  collager.cutoutThickness(10);
  collager.cutoutNoiseScale(0.3);
  collager.rectEdgeOffset(10); // reset to a smaller value for waves if needed

  // Define layout bottom range
  let fromHeight = random(360, 660);
  let toHeight = 960;
  let totalHeight = toHeight - fromHeight;

  let seaLayerCount = floor(random(6, 18) * p2AmountMult);
  let seaLayerOffset = totalHeight / seaLayerCount;

  // Pre-calculate artifact placements
  let artifactCount = floor(random(6, 18) * p2AmountMult);
  if (textIndex == 0) {
    artifactCount = floor(random(3, 8));
  }
  let artifactPlacements = [];

  for (let i = 0; i < artifactCount; i++) {
    artifactPlacements.push({
      layerIndex: floor(random(0, seaLayerCount)),
      xRatio: random(0.1, 0.9),
      artifactIndex: artifactIndices[floor(random(artifactIndices.length))],
    });
  }

  // artifact calculation
  let drawnArtifactCount = 0;


  // wave settings
  let xSamplePoints = 360;
  let waveAmplitude = 120;
  let waveFrequency = lerp(0.001, 0.006, p3);
  let waveNoiseAmplitude = random(60, 240);
  let waveNoiseScale = random(0.005, 0.001);

  let maxThickness = lerp(60, 120, p3);

  let thicknessNoiseScale = 0.001;

  let yBase = fromHeight;

  for (let y = 0; y < seaLayerCount; y++) {
    yBase += seaLayerOffset;

    let lineFrequency = waveFrequency * random(0.8, 1.2);
    let lineAmplitude = waveAmplitude * random(0.8, 1.2);
    let localPhaseShift = random(TWO_PI);
    let lineSeed = random(1000);

    let upperPoints = [];
    let lowerPoints = [];

    let xRange = width * 1.5;
    let xStart = -xRange / 2;
    let xStep = xRange / (xSamplePoints - 1);

    for (let x = 0; x < xSamplePoints; x++) {
      let xPos = xStart + x * xStep;

      let frequencyNoise = noise(xPos * 0.003, yBase * 0.012, lineSeed);
      let localFrequency = lerp(lineFrequency, lineFrequency * 1.6, frequencyNoise);

      let sinePart = Math.sin(xPos * localFrequency + localPhaseShift) * lineAmplitude;
      let noisePart = (noise(xPos * waveNoiseScale, yBase * 0.01, lineSeed) - 0.5) * waveNoiseAmplitude;
      let yCenter = yBase + sinePart + noisePart;

      let thicknessNoise = noise(xPos * thicknessNoiseScale, yBase * thicknessNoiseScale, lineSeed);
      let localThickness = lerp(12, maxThickness, thicknessNoise);

      upperPoints.push(new NYPoint(xPos, yCenter - localThickness / 2));
      lowerPoints.push(new NYPoint(xPos, yCenter + localThickness / 2));
    }

    let waveShapePoints = [...upperPoints, ...[...lowerPoints].reverse()];

    collager.setLutIntensity(random(0.36, 1.0));
    collager.drawVertexShape(waveShapePoints);

    textBGLayer.draw(() => {
      collager.redrawVertexShape();
    });

    tempMaskLayer.draw(() => {
      tint(0, 0, 0);
      collager.redrawVertexShapeOutlineMask();
    });

    // Draw artifacts assigned to this layer
    let artifactsInThisLayer = artifactPlacements.filter((p) => p.layerIndex === y);
    let mountainStartY = random(600, 800); // just for mountains

    for (let artPos of artifactsInThisLayer) {
      let shipXPos = xStart + artPos.xRatio * xRange;
      let sinePart = Math.sin(shipXPos * lineFrequency + localPhaseShift) * lineAmplitude;
      let noisePart = (noise(shipXPos * waveNoiseScale, yBase * 0.01, lineSeed) - 0.5) * waveNoiseAmplitude;
      let yCenter = yBase + sinePart + noisePart;

      let artifact = croppedImageContainer.croppedImageSets[artPos.artifactIndex];

      if (artifact) {
        let drawSize = 300;
        let rotationDegree = 0;
        let yOffsetRatio = 0.4;
        let drawScale = 1.0; // for mountain to scale up

        if (textIndex == 0) {
          // Mountains: Big and standing
          shipXPos = random(-width / 2 - 200, width / 2 + 200);
          drawSize = random(480, 1024) * p2SizeMult * random(p3SizeVarMin, p3SizeVarMax);
          rotationDegree = random(-6, 6);
          yOffsetRatio = 0; // Anchored more to the bottom

          drawScale = random(1.0, 2.0);

          let drawnT = drawnArtifactCount++ / artifactCount;
          yCenter = lerp(mountainStartY, 900, drawnT);
        } else if (textIndex == 1) {
          // Blue Artifacts: Small, full rotation, flowing with waves
          drawSize = random(180, 360) * p2SizeMult * random(p3SizeVarMin, p3SizeVarMax);
          rotationDegree = random(-p3RotRange, p3RotRange);
          yOffsetRatio = random(-0.2, 0.2); // Floating range
        } else if (textIndex == 2) {
          // Boats: Small, slight rotation, floating on waves
          drawSize = random(180, 360) * p2SizeMult * random(p3SizeVarMin, p3SizeVarMax);
          rotationDegree = random(-p3RotRange, p3RotRange);
          yOffsetRatio = random(-0.2, 0.2); // Floating range
        }

        let currentScale = drawSize / max(artifact.imageData.width, artifact.imageData.height);
        let scaledHeight = artifact.imageData.height * currentScale;

        let finalDrawX = shipXPos;
        let finalDrawY = yCenter - scaledHeight * yOffsetRatio;

        collager.setLutIntensity(0.0);
        textBGLayer.draw(() => {
          push();
          translate(finalDrawX, finalDrawY);
          scale(drawScale);

          collager.drawMaskedImage(
            artifact.imageData,
            artifact.curveData,
            0,
            0,
            drawSize,
            rotationDegree
          );

          pop();
        });

        tempMaskLayer.draw(() => {
          push();
          translate(finalDrawX, finalDrawY);
          scale(drawScale);

          tint(0, 0, 0);
          collager.redrawMaskedImageOutlineMask(0, 0, rotationDegree);

          pop();
        });
      }
    }

    // draw all to screen for progress feedback
    background(0, 0, 100);
    image(textBGLayer, 0, 0);
    image(textLayer, 0, 0);

    await collager.sync();
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
let effectTimeCounter = -0.6;

async function startBreathingEffect() {
  // do breathing effect
  let fragShaderPath = "";
  fragShaderPath = shaderPath;

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
    // boat/sea
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
    // boats
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
