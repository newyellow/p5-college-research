// get url parameters
const urlParams = new URLSearchParams(window.location.search);

const seed = urlParams.get('seed') || Math.random() * 100000000;
const p1 = parseFloat(urlParams.get('p1') || Math.random());
const p2 = parseFloat(urlParams.get('p2') || Math.random());
const p3 = parseFloat(urlParams.get('p3') || Math.random());
const subtype = parseInt(urlParams.get("subtype") || (Math.random() * 3));

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

// systems
let collager;
let layoutType = 0;
let artifactImageContainer;

async function setup() {
  _renderer = createCanvas(1080, 1920, WEBGL);
  flex();
  fontResource = await loadFont('../fonts/Monospace.ttf');

  // init buffers
  bufferLayerColorful = createFramebuffer();
  bufferLayerMask = createFramebuffer();


  // setup random values
  seedPRNG(seed);

  mainHue = lerp(0, 360, p1);
  rectBaseSize = lerp(30, 200, p2);
  baseThickness = lerp(1, 10, p3);
  sizeVariation = lerp(0.1, 0.6, p3);

  // set subtype, although not implemented yet
  layoutType = subtype;

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
  background(0, 0, 100);

  // default color bg
  bufferLayerColorful.draw(() => {
    background(0, 0, 100);
  });

  bufferLayerMask.draw(() => {
    background(0, 0, 0);
  });

  // Initialize Collager
  collager = new Collager();
  await collager.initSystem();

  // Initialize artifact images
  artifactImageContainer = new CroppedImageContainer();

  // set lut according to p1
  let lutPath = getLUTPath(p1);
  let lutTexture = await loadImage("../" + lutPath);
  collager.setLutTexture(lutTexture);
  collager.setLutIntensity(0.6);

  // Helper to convert percentage (0-100) to Y coordinate
  const getY = (p) => -height / 2 + (p / 100) * height;

  if (layoutType === 0) {
    // Subtype 0: Mountain & Sky
    let skyPortion = random(40, 70);

    // Draw sky from top to skyPortion
    await drawSkyLayer(-height / 2 - 100, getY(skyPortion), random(-5, 5));

    // Draw mountain from skyPortion to bottom
    // Start slightly above skyPortion for overlap
    await drawMountainLayer(getY(skyPortion) - 200, height / 2 + 100, random(-5, 5), 24);

  } else if (layoutType === 1 || layoutType === 2) {
    // Subtype 1: Ocean, Subtype 2: Farmland
    let isSandwichLayout = random() < 0.5;

    if (!isSandwichLayout) {
      // 1. standard: mountain -> sea/land (no sky)
      let mtPortion = random(30, 60);
      let mtStart = -height / 2 - 100;
      let layerEnd = getY(mtPortion);

      await drawMountainLayer(mtStart, layerEnd + 100, random(-12, 12), 12);

      if (layoutType === 1) {
        await drawSeaLayer(layerEnd + 240, height / 2 + 100, random(-6, 6));
      } else {
        await drawLandLayer(layerEnd + 120, height / 2 + 100, random(-12, 0));
      }
    } else {
      // 2. sandwich: mountain top -> sea/land -> mountain bottom (no sky)
      let mtTopPortion = random(10, 30);
      let mtBotPortion = random(10, 30);

      let seaLandStart = getY(mtTopPortion);
      let seaLandEnd = getY(100 - mtBotPortion);

      // Top mountain
      await drawMountainLayer(-height / 2 - 100, seaLandStart + 100, random(-12, 12), 8);

      // Sea or Land in the middle
      if (layoutType === 1) {
        await drawSeaLayer(seaLandStart + 240, seaLandEnd + 300, random(-6, 6));
      } else {
        await drawLandLayer(seaLandStart + 120, seaLandEnd + 100, random(-12, 0));
      }

      // Bottom mountain
      await drawMountainLayer(seaLandEnd - 200, height / 2 + 100, random(-5, 5), 8);
    }
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

    await collager.sync();
  }
}



async function drawLandLayer(_fromHeight, _toHeight, _angle = 0) {
  collager.clearImages();
  await collager.addImage('images/farmland_01.jpg', 0.2, 0.8);
  await collager.addImage('images/farmland_02.png', 0.2, 0.8);
  await collager.addImage('images/farmland_03.jpg', 0.2, 0.8);

  // add artifact images for ducks
  artifactImageContainer.clearImageSets();
  await artifactImageContainer.addImage('artifacts/duck_01.jpg', 'artifacts/duck_01.json');
  await artifactImageContainer.addImage('artifacts/duck_02.jpg', 'artifacts/duck_02.json');
  await artifactImageContainer.addImage('artifacts/duck_03.jpg', 'artifacts/duck_03.json');

  collager.cutoutThickness(10);
  collager.cutoutNoiseScale(0.5);
  collager.cutoutRatio(0.2, 0.8);

  collager.outlineWeight(0);

  let landWidth = width * 2.0;
  let landHeight = _toHeight - _fromHeight;

  let skewAmount = 0.4; // perspective skew
  let totalSkewShift = landWidth * skewAmount;
  let startXOffset = -landWidth / 2 - totalSkewShift / 2;

  // Coordinate mapping function (normalized u, v [0, 1] to screen x, y)
  let getPos = (u, v) => {
    let x = startXOffset + u * landWidth + v * landWidth * skewAmount;
    let y = _fromHeight + v * landHeight;
    return { x, y };
  };

  // Recursive subdivision function
  const subdivide = async (u1, v1, u2, v2, depth) => {
    let w = u2 - u1;
    let h = v2 - v1;

    // Stopping condition: max depth, too small, or random chance for variety
    if (depth <= 0 || (w < 0.15 && h < 0.15) || (random() < 0.2 && depth < 3)) {
      let p00 = getPos(u1, v1);
      let p10 = getPos(u2, v1);
      let p11 = getPos(u2, v2);
      let p01 = getPos(u1, v2);

      await drawLandRect(p00, p10, p11, p01, _angle);
      await collager.sync();
      return;
    }

    // Decide split axis based on aspect ratio with some randomness
    let splitVertical = w > h;
    if (abs(w - h) < 0.1) splitVertical = random() > 0.5;

    let ratio = random(0.3, 0.7);
    if (splitVertical) {
      let splitU = u1 + w * ratio;
      await subdivide(u1, v1, splitU, v2, depth - 1);
      await subdivide(splitU, v1, u2, v2, depth - 1);
    } else {
      let splitV = v1 + h * ratio;
      await subdivide(u1, v1, u2, splitV, depth - 1);
      await subdivide(u1, splitV, u2, v2, depth - 1);
    }
  };

  // Start subdivision from the full area
  await subdivide(0, 0, 1, 1, 5);

  // Pre-generate ducks data for sorting and sizing
  let maxDuckCount = int(lerp(3, 18, p3));
  let duckCount = int(random(2, maxDuckCount));

  let ducks = [];
  for (let i = 0; i < duckCount; i++) {
    let u = random(0.1, 0.9);
    let v = random(0.1, 0.9);
    let rawPos = getPos(u, v);

    // Rotate position to match land rotation
    let rad = radians(_angle);
    let drawPosX = rawPos.x * cos(rad) - rawPos.y * sin(rad);
    let drawPosY = rawPos.x * sin(rad) + rawPos.y * cos(rad);

    ducks.push({ u, v, drawPosX, drawPosY });
  }

  // Sort ducks by Y coordinate so they overlap correctly (closer to bottom drawn later)
  ducks.sort((a, b) => a.drawPosY - b.drawPosY);

  for (let duck of ducks) {
    let artifact = artifactImageContainer.getRandomCroppedImageSet();
    if (artifact) {
      // setup collager for artifact layer
      collager.cutoutThickness(1);
      collager.cutoutRatio(0.1, 0.9);

      collager.outlineWeight(24);
      collager.shadow(10, -6, 10, [0, 0, 0], 0.36);

      // Sizing based on depth (v) - closer ducks are larger
      let drawSize = lerp(120, 240, duck.v) * random(0.9, 1, 1);
      let duckRotation = random(-20, 20);

      let currentScale = drawSize / max(artifact.imageData.width, artifact.imageData.height);
      let scaledHeight = artifact.imageData.height * currentScale;

      // Scaling from bottom center
      // Offset center up by half height in duck's local rotated coordinate space
      let duckRad = radians(duckRotation);
      let offX = (scaledHeight / 2) * sin(duckRad);
      let offY = -(scaledHeight / 2) * cos(duckRad);

      let finalDrawX = duck.drawPosX + offX;
      let finalDrawY = duck.drawPosY + offY;

      collager.drawMaskedImage(
        artifact.imageData,
        artifact.curveData,
        finalDrawX,
        finalDrawY,
        drawSize,
        duckRotation
      );

      bufferLayerColorful.draw(() => {
        collager.redrawMaskedImage(finalDrawX, finalDrawY, duckRotation);
      });

      bufferLayerMask.draw(() => {
        colorMode(RGB);
        tint(0, 0, 0);
        collager.redrawMaskedImageOutlineMask(finalDrawX, finalDrawY, duckRotation);
        
        let drawInMask = random(0, 1) < 0.48;
        if (drawInMask) {
          tint(255, random(0, 255), 1);
          collager.redrawMaskedImageInsideMask(finalDrawX, finalDrawY, duckRotation);
        }
      });

      await collager.sync();
    }
  }
}

async function drawLandRect(p00, p10, p11, p01, _angle) {
  let isVertical = random() > 0.5;
  let rad = radians(_angle);

  // Helper to rotate points
  const rotatePt = (pt) => {
    return {
      x: pt.x * cos(rad) - pt.y * sin(rad),
      y: pt.x * sin(rad) + pt.y * cos(rad)
    };
  };

  const ensureClockwise = (pts) => {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      let p1 = pts[i];
      let p2 = pts[(i + 1) % pts.length];
      s += (p2.x - p1.x) * (p2.y + p1.y);
    }
    if (s > 0) pts.reverse();
    return pts;
  };

  let fieldPoints = [
    rotatePt(p00),
    rotatePt(p10),
    rotatePt(p11),
    rotatePt(p01)
  ].map(v => new NYPoint(v.x, v.y));

  // Ensure fieldPoints are clockwise
  ensureClockwise(fieldPoints);

  // Pick a single image and mask status for the whole field
  let imageIndex = floor(random(0, collager.images.length));
  let drawInMask = random() < 0.2;

  // Special chance for "single full rect" mode
  let isSingleFullRect = random() < 0.2;

  if (isSingleFullRect) {
    // 1. Draw full field shape
    collager.drawVertexShape(fieldPoints, imageIndex);
    collager.redrawVertexShape();

    bufferLayerColorful.draw(() => {
      collager.redrawVertexShape();
    });

    bufferLayerMask.draw(() => {
      colorMode(RGB);
      tint(0, 0, 0);
      collager.redrawVertexShapeOutlineMask();
      if (drawInMask) {
        tint(255, random(0, 255), 1);
        collager.redrawVertexShapeInsideMask();
      }
    });

    // 2. Draw 4 borders
    let edges = [[p00, p10, p01, p11], [p10, p11, p00, p01], [p11, p01, p10, p00], [p01, p00, p11, p10]];
    for (let i = 0; i < 4; i++) {
      let pt1 = edges[i][0];
      let pt2 = edges[i][1];
      let ptOpp1 = edges[i][2];
      let ptOpp2 = edges[i][3];

      let thickness = random(10, 25);

      let dirX = (ptOpp1.x + ptOpp2.x) / 2 - (pt1.x + pt2.x) / 2;
      let dirY = (ptOpp1.y + ptOpp2.y) / 2 - (pt1.y + pt2.y) / 2;
      let distToCenter = dist(0, 0, dirX, dirY);
      let ratio = thickness / distToCenter;

      let v1 = pt1;
      let v2 = pt2;
      let v3 = { x: pt2.x + dirX * ratio, y: pt2.y + dirY * ratio };
      let v4 = { x: pt1.x + dirX * ratio, y: pt1.y + dirY * ratio };

      let borderPoints = [rotatePt(v1), rotatePt(v2), rotatePt(v3), rotatePt(v4)].map(v => new NYPoint(v.x, v.y));
      ensureClockwise(borderPoints);

      collager.drawVertexShape(borderPoints, imageIndex);
      collager.redrawVertexShape();

      bufferLayerColorful.draw(() => {
        collager.redrawVertexShape();
      });
    }
  } else {
    // Existing hatch line logic
    let density = floor(random(3, 13));

    collager.cutoutThickness(lerp(12, 24, p3));
    collager.cutoutNoiseScale(lerp(0.3, 0.6, p3));
    collager.cutoutRatio(0.2, 0.8);

    collager.outlineWeight(lerp(12, 60, p3));
    collager.outlineRatio(0.2, 0.8);
    collager.outlineNoiseScale(lerp(0.6, 1.2, p3));

    for (let i = 0; i < density; i++) {
      let t1 = (i - 0.2) / density;
      let t2 = (i + 1.2) / density;

      let v1, v2, v3, v4;
      if (isVertical) {
        v1 = { x: lerp(p00.x, p01.x, t1), y: lerp(p00.y, p01.y, t1) };
        v2 = { x: lerp(p10.x, p11.x, t1), y: lerp(p10.y, p11.y, t1) };
        v3 = { x: lerp(p10.x, p11.x, t2), y: lerp(p10.y, p11.y, t2) };
        v4 = { x: lerp(p00.x, p01.x, t2), y: lerp(p00.y, p01.y, t2) };
      } else {
        v1 = { x: lerp(p00.x, p10.x, t1), y: lerp(p00.y, p10.y, t1) };
        v2 = { x: lerp(p01.x, p11.x, t1), y: lerp(p01.y, p11.y, t1) };
        v3 = { x: lerp(p01.x, p11.x, t2), y: lerp(p01.y, p11.y, t2) };
        v4 = { x: lerp(p00.x, p10.x, t2), y: lerp(p00.y, p10.y, t2) };
      }

      let linePoints = [rotatePt(v1), rotatePt(v2), rotatePt(v3), rotatePt(v4)].map(v => new NYPoint(v.x, v.y));
      ensureClockwise(linePoints);

      collager.drawVertexShape(linePoints, imageIndex);
      collager.redrawVertexShape();

      bufferLayerColorful.draw(() => {
        collager.redrawVertexShape();
      });

      bufferLayerMask.draw(() => {
        colorMode(RGB);
        tint(0, 0, 0);
        collager.redrawVertexShapeOutlineMask();

        if (drawInMask) {
          tint(255, random(0, 255), 1);
          collager.redrawVertexShapeInsideMask();
        }
      });
    }
  }
}

async function drawSeaLayer(_fromHeight, _toHeight, _angle = 0) {
  collager.clearImages();
  await collager.addImage('images/sea_01.jpeg', 0.1, 0.4);

  // add artifact images for ships
  artifactImageContainer.clearImageSets();
  await artifactImageContainer.addImage('artifacts/ship_01.png', 'artifacts/ship_01.json');
  await artifactImageContainer.addImage('artifacts/ship_02.png', 'artifacts/ship_02.json');
  await artifactImageContainer.addImage('artifacts/boat_01.png', 'artifacts/boat_01.json');
  await artifactImageContainer.addImage('artifacts/boat_02.png', 'artifacts/boat_02.json');
  await artifactImageContainer.addImage('artifacts/boat_03.png', 'artifacts/boat_03.json');
  await artifactImageContainer.addImage('artifacts/boat_04.png', 'artifacts/boat_04.json');

  collager.cutoutThickness(20);
  collager.cutoutNoiseScale(0.3);
  collager.cutoutRatio(0.2, 0.8);

  let waveOutlineThickness = lerp(12, 120, p3);
  collager.outlineWeight(waveOutlineThickness);
  collager.outlineRatio(0.2, 0.8);
  collager.outlineNoiseScale(0.01);

  collager.shadow(10, 0, 10, [0, 0, random(0.1, 0.3)], 0.36);

  let totalHeight = Math.abs(_toHeight - _fromHeight);
  let layerSpacing = 10; // Desired distance between layers
  let seaLayerCount = Math.max(4, Math.floor(totalHeight / layerSpacing));
  let seaLayerOffset = totalHeight / seaLayerCount;

  // Pre-calculate ship placements
  let maxShipCount = int(lerp(6, 36, p3));
  let shipCount = int(random(0, maxShipCount));
  let shipPlacements = [];
  for (let i = 0; i < shipCount; i++) {
    shipPlacements.push({
      layerIndex: int(random(0, seaLayerCount)),
      xRatio: random(0.2, 0.8)
    });
  }

  let xSamplePoints = 40;

  let seaHeightRange = [30, 100]; // thickness variation range
  let seaThicknessNoiseScaleX = 0.005;
  let seaThicknessNoiseScaleY = 0.02;

  let waveAmplitude = lerp(20, 120, p3);
  let waveFrequency = random(0.004, 0.006);
  let waveNoiseAmplitude = random(20, 40);
  let waveNoiseScale = random(0.005, 0.015);

  let yBase = _fromHeight;

  for (let y = 0; y < seaLayerCount; y++) {
    // Restore wave settings for collager
    collager.cutoutThickness(20);
    collager.cutoutNoiseScale(0.3);
    collager.cutoutRatio(0.2, 0.8);
    collager.outlineWeight(waveOutlineThickness);
    collager.outlineRatio(0.2, 0.8);
    collager.outlineNoiseScale(0.01);

    yBase += seaLayerOffset;

    // randomize some parameters for each layer using noise
    let freqNoise = noise(yBase * 0.01, 1234);
    let ampNoise = noise(yBase * 0.01, 5678);
    let noiseAmpNoise = noise(yBase * 0.01, 9999);

    let lineFrequency = waveFrequency * lerp(0.8, 1.2, freqNoise);
    let lineAmplitude = waveAmplitude * lerp(0.8, 1.2, ampNoise);
    let lineNoiseAmplitude = waveNoiseAmplitude * lerp(0.5, 1.5, noiseAmpNoise);

    let upperPoints = [];
    let lowerPoints = [];

    // Wider range for rotation coverage
    let xRange = width * 2.0;
    let xStart = -xRange / 2;
    let xEnd = xRange / 2;
    let xStep = xRange / (xSamplePoints - 1);

    let lineSeed = random(1000);
    let localPhaseShift = random(TWO_PI);

    for (let x = 0; x < xSamplePoints; x++) {
      let xPos = xStart + x * xStep;

      // Base waveform: Sine wave + Noise
      let sinePart = Math.sin(xPos * lineFrequency + localPhaseShift) * lineAmplitude;
      let noisePart = (noise(xPos * waveNoiseScale, yBase * 0.01, lineSeed) - 0.5) * lineNoiseAmplitude;
      let yCenter = yBase + sinePart + noisePart;

      // Thickness variation: Noise based
      let tNoise = noise(xPos * seaThicknessNoiseScaleX, yBase * seaThicknessNoiseScaleY, lineSeed);
      let localThickness = lerp(seaHeightRange[0], seaHeightRange[1], tNoise);

      let upY = yCenter - localThickness / 2;
      let loY = yCenter + localThickness / 2;

      // Rotate points directly (like mountain layer)
      let rad = radians(_angle);
      let urx = xPos * Math.cos(rad) - upY * Math.sin(rad);
      let ury = xPos * Math.sin(rad) + upY * Math.cos(rad);
      let lrx = xPos * Math.cos(rad) - loY * Math.sin(rad);
      let lry = xPos * Math.sin(rad) + loY * Math.cos(rad);

      upperPoints.push(new NYPoint(urx, ury));
      lowerPoints.push(new NYPoint(lrx, lry));
    }

    // build clockwise array
    let waveShapePoints = [];
    waveShapePoints.push(...upperPoints);
    let reversedLower = [...lowerPoints].reverse();
    waveShapePoints.push(...reversedLower);

    collager.drawVertexShape(waveShapePoints);

    // draw on color
    bufferLayerColorful.draw(() => {
      collager.redrawVertexShape();
    });

    bufferLayerMask.draw(() => {
      colorMode(RGB);
      tint(0, 0, 0);
      collager.redrawVertexShapeOutlineMask();

      let drawInMask = random() < 0.36;
      if (drawInMask) {
        tint(255, random(0, 255), 2);
        collager.redrawVertexShapeInsideMask();
      }
    });

    // Draw ships assigned to this layer
    let shipsInThisLayer = shipPlacements.filter(p => p.layerIndex === y);
    for (let shipPos of shipsInThisLayer) {
      let xRange = width * 2.0;
      let xStart = -xRange / 2;
      let shipXPos = xStart + shipPos.xRatio * xRange;

      let sinePart = Math.sin(shipXPos * lineFrequency + localPhaseShift) * lineAmplitude;
      let noisePart = (noise(shipXPos * waveNoiseScale, yBase * 0.01, lineSeed) - 0.5) * lineNoiseAmplitude;
      let yCenter = yBase + sinePart + noisePart;

      let artifactIndex = int(random(0, 6));
      let artifact = artifactImageContainer.croppedImageSets[artifactIndex];

      if (artifact) {
        // setup collager for artifact layer
        collager.cutoutThickness(1);
        collager.cutoutRatio(0.2, 0.8);

        collager.outlineWeight(40);
        collager.outlineRatio(0.2, 0.8);
        collager.outlineNoiseScale(0.36);

        let rad = radians(_angle);
        let drawPosX = shipXPos * cos(rad) - yCenter * sin(rad);
        let drawPosY = shipXPos * sin(rad) + yCenter * cos(rad);

        let drawSize = random(240, 360);
        if (artifactIndex == 4) // rect boat, need to scale down
          drawSize *= 0.36;

        let currentScale = drawSize / max(artifact.imageData.width, artifact.imageData.height);
        let scaledHeight = artifact.imageData.height * currentScale;

        let offX = (scaledHeight * 0.4) * sin(rad);
        let offY = -(scaledHeight * 0.4) * cos(rad);

        let finalDrawX = drawPosX + offX;
        let finalDrawY = drawPosY + offY;

        collager.drawMaskedImage(
          artifact.imageData,
          artifact.curveData,
          finalDrawX,
          finalDrawY,
          drawSize,
          _angle
        );

        bufferLayerColorful.draw(() => {
          collager.redrawMaskedImage(finalDrawX, finalDrawY, _angle);
        });

        bufferLayerMask.draw(() => {
          colorMode(RGB);
          tint(0, 0, 0);
          collager.redrawMaskedImageOutlineMask(finalDrawX, finalDrawY, _angle);
          let drawInMask = random(0, 1) < 0.48;
          if (drawInMask) {
            tint(255, random(0, 255), 2);
            collager.redrawMaskedImageInsideMask(finalDrawX, finalDrawY, _angle);
          }
        });
      }
    }

    await collager.sync();
  }
}

async function drawMountainLayer(_startY, _endY, _angle = 0, _count = 24) {
  collager.clearImages();
  await collager.addImage('images/train_01.jpg', 0.2, 0.6);
  await collager.addImage('images/train_02.jpg', 0.2, 0.6);

  // add artifact images
  artifactImageContainer.clearImageSets();
  await artifactImageContainer.addImage('artifacts/mountain_01.png', 'artifacts/mountain_01.json');
  await artifactImageContainer.addImage('artifacts/mountain_02.png', 'artifacts/mountain_02.json');
  await artifactImageContainer.addImage('artifacts/stone_01.png', 'artifacts/stone_01.json');
  await artifactImageContainer.addImage('artifacts/stone_02.png', 'artifacts/stone_02.json');
  await artifactImageContainer.addImage('artifacts/stone_03.png', 'artifacts/stone_03.json');
  await artifactImageContainer.addImage('artifacts/stone_04.png', 'artifacts/stone_04.json');


  let mountainLayerCount = _count;
  let xSamplePoints = int(random(36, 24));

  let mountainHeightRange = [30, 480];
  let mountainHeightNoiseScaleX = lerp(0.002, 0.006, p3);
  let mountainHeightNoiseScaleY = lerp(0.012, 0.036, p3);

  // Calculate offset based on range to ensure we fill the space
  let totalHeight = _endY - _startY;
  let mountainLayerOffset = totalHeight / mountainLayerCount;

  let yStart = _startY;

  for (let y = 0; y < mountainLayerCount; y++) {

    // setup collager for mountain layer
    collager.cutoutThickness(200);
    collager.cutoutNoiseScale(lerp(0.12, 0.66, p3));
    collager.cutoutRatio(0.2, 0.8);

    collager.outlineWeight(100);
    collager.outlineNoiseScale(lerp(0.006, 0.12, p3));
    collager.outlineRatio(0.2, 0.8);

    collager.shadow(10, 0, -10, [0, 0, 0], 0.36);

    // Increase yStart more predictably to reach _endY
    yStart += mountainLayerOffset;

    let mountainUpperPoints = [];
    let mountainLowerPoints = [];

    // Wider range to account for rotation
    let xRange = width * 2.0;
    let xStart = -xRange / 2;
    let xEnd = xRange / 2;

    let xStep = xRange / (xSamplePoints - 1);

    for (let x = 0; x < xSamplePoints; x++) {
      let xt = x / (xSamplePoints - 1);

      let xPos = lerp(xStart, xEnd, xt) + random(-0.1, 0.1) * xStep;
      let yPos = yStart;

      let heightNoiseValue = noise(xPos * mountainHeightNoiseScaleX, yPos * mountainHeightNoiseScaleY, 1234);
      let mountainAddHeight = lerp(mountainHeightRange[0], mountainHeightRange[1], heightNoiseValue);

      let botXPos = lerp(xStart, xEnd, xt) + random(-0.1, 0.1) * xStep;
      let botYPos = yStart;

      let botNoiseValue = noise(botXPos * mountainHeightNoiseScaleX, botYPos * mountainHeightNoiseScaleY, 1234);
      let botAddHeight = lerp(30, 100, botNoiseValue);

      yPos -= mountainAddHeight;
      botYPos += botAddHeight;

      // Rotate points
      let rad = radians(_angle);
      let rx = xPos * cos(rad) - yPos * sin(rad);
      let ry = xPos * sin(rad) + yPos * cos(rad);
      let rbx = botXPos * cos(rad) - botYPos * sin(rad);
      let rby = botXPos * sin(rad) + botYPos * cos(rad);

      mountainUpperPoints.push(new NYPoint(rx, ry));
      mountainLowerPoints.push(new NYPoint(rbx, rby));
    }

    // build clockwise array
    let mountainPoints = [];
    mountainPoints.push(...mountainUpperPoints);
    mountainPoints.push(...mountainLowerPoints.reverse());

    collager.drawVertexShape(mountainPoints);

    // draw on color
    bufferLayerColorful.draw(() => {
      collager.redrawVertexShape();
    });

    bufferLayerMask.draw(() => {
      colorMode(RGB);
      tint(0, 0, 0);
      collager.redrawVertexShapeOutlineMask();

      let drawInMask = random(0, 1) < 0.24;

      if (drawInMask) {
        tint(255, random(0, 255), 3);
        collager.redrawVertexShapeInsideMask();
      }
    })


    // Chance to draw an artifact between mountain layers
    if (random() < 0.25) {

      let isMountainObject = random() < 0.5;
      let artifactIndex = isMountainObject ? 0 : 1;

      if (isMountainObject) {
        artifactIndex = int(random(0, 2));
      }
      else {
        artifactIndex = int(random(2, 4));
      }

      let artifact = artifactImageContainer.croppedImageSets[artifactIndex];

      // setup collager for artifact layer
      collager.cutoutThickness(1);
      collager.cutoutRatio(0.2, 0.8);

      collager.outlineWeight(100);

      if (artifact) {
        let rawPosX = random(-width / 2 - 200, width / 2 + 200);
        let rawPosY = yStart + 100;

        // if it is the last layer of the mountain layer
        if (y === mountainLayerCount - 1) {
          rawPosY = yStart + 300;
        }

        // Rotate the position to match mountain layer rotation
        let rad = radians(_angle);
        let drawPosX = rawPosX * cos(rad) - rawPosY * sin(rad);
        let drawPosY = rawPosX * sin(rad) + rawPosY * cos(rad);

        // this is the mountain object size
        let drawSize = random(600, 1000); // this is the max side
        let currentScale = random(0.8, 3.0);

        let maskedImgRatio = artifact.imageData.width / artifact.imageData.height;
        let drawHeight = drawSize / maskedImgRatio;

        if (!isMountainObject) {
          drawSize = random(360, 600);
          currentScale = 1.0;
          drawHeight = drawSize;
        }

        let scaledHeight = drawHeight * currentScale;

        // Offset center up by half height in rotated coordinate space
        let offX = (scaledHeight / 2) * sin(rad);
        let offY = -(scaledHeight / 2) * cos(rad);

        let finalDrawX = drawPosX + offX;
        let finalDrawY = drawPosY + offY;

        push();
        translate(finalDrawX, finalDrawY);
        rotate(radians(_angle));
        scale(currentScale);

        collager.drawMaskedImage(
          artifact.imageData,
          artifact.curveData, 0, 0,
          drawSize,
          0
        );
        pop();

        // draw on color
        bufferLayerColorful.draw(() => {
          push();
          translate(finalDrawX, finalDrawY);
          rotate(radians(_angle));
          scale(currentScale);
          collager.redrawMaskedImage(0, 0, 0);
          pop();
        });

        bufferLayerMask.draw(() => {
          push();
          translate(finalDrawX, finalDrawY);
          rotate(radians(_angle));
          scale(currentScale);

          colorMode(RGB);
          tint(0, 0, 0);
          collager.redrawMaskedImageOutlineMask(0, 0, 0);
          pop();

          let drawInMask = random(0, 1) < 0.48;

          if (drawInMask) {
            push();
            translate(finalDrawX, finalDrawY);
            rotate(radians(_angle));
            scale(currentScale);

            tint(255, random(0, 255), 3);
            collager.redrawMaskedImageInsideMask(0, 0, 0);
            pop();
          }
        });
      }
    }

    await collager.sync();
  }
}

async function drawSkyLayer(_fromHeight, _toHeight, _angle = 0) {
  // Add images
  await collager.addImage('images/sky_01.png', 0.1, 0.6);
  await collager.addImage('images/sky_02.jpg', 0.1, 0.3);

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

  let skyRotationNoiseScale = lerp(0.0001, 0.0012, p3);
  // Draw Rects
  let flowFieldsCount = 2000;
  for (let i = 0; i < flowFieldsCount; i++) {
    let posX = random(-width / 2 - 200, width / 2 + 200);
    let posY = random(_fromHeight, _toHeight);

    let sizeW = random(120, 240);
    let sizeH = random(20, 40);

    let angleNoise = noise(posX * skyRotationNoiseScale, posY * skyRotationNoiseScale, 666.0);
    let angleDegree = lerp(-360, 360, angleNoise);

    push();
    rotate(radians(_angle));
    collager.drawRect(posX, posY, sizeW, sizeH, angleDegree);
    pop();

    // draw on color
    bufferLayerColorful.draw(() => {
      push();
      rotate(radians(_angle));
      collager.redrawRect(posX, posY, sizeW, sizeH, angleDegree);
      pop();
    });

    bufferLayerMask.draw(() => {
      push();
      rotate(radians(_angle));
      colorMode(RGB);
      tint(0, 0, 0);
      collager.redrawRectOutlineMask(posX, posY, sizeW, sizeH, angleDegree);

      let drawInMask = random(0, 1) < 0.24;
      if (drawInMask) {
        tint(255, random(0, 255), 4);
        collager.redrawRectInsideMask(posX, posY, sizeW, sizeH, angleDegree);
      }
      pop();
    });


    if (i % 5 == 0) {
      await collager.sync();
    }
  }

}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
