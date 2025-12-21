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
  sizeVariation = lerp(0.1, 0.6, p3);

  // set subtype, although not implemented yet
  let layoutType = subtype;

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
  collager = new Collager();
  await collager.initSystem();

  // set lut according to p1
  let lutPath = getLUTPath(p1);
  let lutTexture = await loadImage("../" + lutPath);
  collager.setLutTexture(lutTexture);
  collager.setLutIntensity(0.36);

  // draw sky layer
  await drawSkyLayer(-height / 2 - 100, -100, random(-5, 5));

  // draw mountains
  await drawMountainLayer(-400, random(-5, 5));

  // draw sea layer
  await drawSeaLayer(100, 500, random(-3, 3));

  // draw land layer
  await drawLandLayer(400, height / 2 + 100, random(-10, 10));

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



async function drawLandLayer(_fromHeight, _toHeight, _angle = 0) {
  collager.clearImages();
  await collager.addImage('images/farmland_01.jpg', 0.1, 0.4);
  await collager.addImage('images/farmland_02.png', 0.1, 0.4);
  await collager.addImage('images/farmland_03.jpg', 0.1, 0.4);
  await collager.addImage('images/farmland_04.jpg', 0.1, 0.4);
  await collager.addImage('images/farmland_05.jpg', 0.1, 0.4);

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
      await sleep(20);
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
}

async function drawLandRect(p00, p10, p11, p01, _angle) {
  let isVertical = random() > 0.5;
  let fieldPoints = [
    new NYPoint(p00.x, p00.y),
    new NYPoint(p10.x, p10.y),
    new NYPoint(p11.x, p11.y),
    new NYPoint(p01.x, p01.y)
  ];

  // Pick a single image and mask status for the whole field
  let imageIndex = floor(random(0, collager.images.length));
  let drawInMask = random() < 0.2;

  // Special chance for "single full rect" mode
  let isSingleFullRect = random() < 0.2;

  if (isSingleFullRect) {
    // 1. Draw full field shape
    collager.drawVertexShape(fieldPoints, imageIndex);
    
    push();
    rotate(radians(_angle));
    collager.redrawVertexShape();
    pop();

    bufferLayerColorful.draw(() => {
      push();
      rotate(radians(_angle));
      collager.redrawVertexShape();
      pop();
    });

    bufferLayerMask.draw(() => {
      push();
      rotate(radians(_angle));
      colorMode(RGB);
      tint(0, 0, 0);
      collager.redrawVertexShapeOutlineMask();
      if (drawInMask) {
        tint(255, random(0, 255), 255);
        collager.redrawVertexShapeInsideMask();
      }
      pop();
    });

    // 2. Draw 4 borders
    let edges = [[p00, p10, p01, p11], [p10, p11, p00, p01], [p11, p01, p10, p00], [p01, p00, p11, p10]];
    for (let i = 0; i < 4; i++) {
      let pt1 = edges[i][0];
      let pt2 = edges[i][1];
      let ptOpp1 = edges[i][2];
      let ptOpp2 = edges[i][3];

      let thickness = random(10, 25);
      
      // Calculate a small parallelogram for the border
      // We shift pt1 and pt2 towards the center of the field by thickness
      let dirX = (ptOpp1.x + ptOpp2.x) / 2 - (pt1.x + pt2.x) / 2;
      let dirY = (ptOpp1.y + ptOpp2.y) / 2 - (pt1.y + pt2.y) / 2;
      let distToCenter = dist(0, 0, dirX, dirY);
      let ratio = thickness / distToCenter;
      
      let v1 = pt1;
      let v2 = pt2;
      let v3 = { x: pt2.x + dirX * ratio, y: pt2.y + dirY * ratio };
      let v4 = { x: pt1.x + dirX * ratio, y: pt1.y + dirY * ratio };

      let borderPoints = [v1, v2, v3, v4].map(v => new NYPoint(v.x, v.y));
      let centerX = (v1.x + v2.x + v3.x + v4.x) / 4;
      let centerY = (v1.y + v2.y + v3.y + v4.y) / 4;

      push();
      rotate(radians(_angle));
      collager.drawCustomShape(borderPoints, centerX, centerY, 0, imageIndex);
      pop();

      bufferLayerColorful.draw(() => {
        push();
        rotate(radians(_angle));
        collager.redrawCustomShape(centerX, centerY, 0);
        pop();
      });
    }
  } else {
    // Existing hatch line logic
    let density = floor(random(6, 12)); 

    collager.cutoutThickness(3);
    collager.cutoutNoiseScale(0.3);
    collager.cutoutRatio(0.2, 0.8);
  
    collager.outlineWeight(random(24, 60));
    collager.outlineRatio(0.2, 0.8);
    collager.outlineNoiseScale(0.6);

    collager.debug(false);
    
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

      let linePoints = [v1, v2, v3, v4].map(v => new NYPoint(v.x, v.y));
      let centerX = (v1.x + v2.x + v3.x + v4.x) / 4;
      let centerY = (v1.y + v2.y + v3.y + v4.y) / 4;

      push();
      rotate(radians(_angle));
      collager.drawCustomShape(linePoints, centerX, centerY, 0, imageIndex);
      pop();

      bufferLayerColorful.draw(() => {
        push();
        rotate(radians(_angle));
        collager.redrawCustomShape(centerX, centerY, 0);
        pop();
      });

      bufferLayerMask.draw(() => {
        push();
        rotate(radians(_angle));
        colorMode(RGB);
        tint(0, 0, 0);
        collager.redrawCustomShapeOutlineMask(centerX, centerY, 0);

        if (drawInMask) {
          tint(255, random(0, 255), 255);
          collager.redrawCustomShapeInsideMask(centerX, centerY, 0);
        }
        pop();
      });
    }
  }
}

async function drawSeaLayer(_fromHeight, _toHeight, _angle = 0) {
  collager.clearImages();
  await collager.addImage('images/sea_01.jpeg', 0.1, 0.4);

  collager.cutoutThickness(3);
  collager.cutoutNoiseScale(0.3);
  collager.cutoutRatio(0.2, 0.8);

  collager.outlineWeight(20);
  collager.outlineRatio(0.2, 0.8);
  collager.outlineNoiseScale(1.0);

  collager.rectEdgeOffset(5);
  collager.rectRoundness(0);
  collager.rectNoiseScale(0.05);
  collager.rectPointCount(20);

  let lines = 24;
  let stepsPerLine = 40;
  let seaWidth = width * 1.5; 
  let xStart = -seaWidth / 2;
  let xStep = seaWidth / stepsPerLine;
  
  // Base wave parameters
  let baseWaveAmplitude = random(40, 100);
  let baseWaveFrequency = random(0.003, 0.01);
  let baseNoise2DScale = random(0.002, 0.006);

  for (let l = 0; l < lines; l++) {
    let yProgress = l / (lines - 1);
    let posYBase = lerp(_fromHeight, _toHeight, yProgress);
    
    // Per-line wave variation
    let lineSeed = random(1000);
    let localWaveFrequency = baseWaveFrequency * random(0.9, 1.1);
    let localPhaseShift = random(TWO_PI * 0.3); // Different "starting point" for sine wave
    let localWaveAmplitude = baseWaveAmplitude * random(0.9, 1.1);
    let localNoiseScale = baseNoise2DScale * random(0.8, 1.2);
    
    // Pick entire line for mask
    let isLineInMask = random() < 0.2; 

    for (let s = 0; s < stepsPerLine; s++) {
      let posX = xStart + s * xStep + random(-10, 10);
      
      // Calculate wave height using dynamic Sine + 2D Noise
      // Adding localPhaseShift makes each line "offset" in the sine cycle
      let sinePart = sin(posX * localWaveFrequency + localPhaseShift) * localWaveAmplitude;
      let noisePart = (noise(posX * localNoiseScale, posYBase * localNoiseScale, lineSeed) - 0.5) * localWaveAmplitude * 1.5;
      
      let posY = posYBase + sinePart + noisePart;

      let sizeW = random(80, 180);
      let sizeH = random(8, 16);

      // Estimate slope for angle calculation
      let sampleNextX = posX + 5;
      let nextSinePart = sin(sampleNextX * localWaveFrequency + localPhaseShift) * localWaveAmplitude;
      let nextNoisePart = (noise(sampleNextX * localNoiseScale, posYBase * localNoiseScale, lineSeed) - 0.5) * localWaveAmplitude * 1.5;
      let nextPosY = posYBase + nextSinePart + nextNoisePart;
      
      let angleRad = atan2(nextPosY - posY, sampleNextX - posX);
      let angleDegree = degrees(angleRad);

      push();
      rotate(radians(_angle));
      collager.drawRect(posX, posY, sizeW, sizeH, angleDegree);
      pop();

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
        
        // Always clear mask for this rect first
        tint(0, 0, 0);
        collager.redrawRectOutlineMask(posX, posY, sizeW, sizeH, angleDegree);

        // If line is selected, draw into the mask
        if (isLineInMask) {
          tint(255, random(0, 255), 255);
          collager.redrawRectInsideMask(posX, posY, sizeW, sizeH, angleDegree);
        }
        pop();
      });
    }
    
    await sleep(50); // Draw line by line
  }
}

async function drawMountainLayer(_yOffset, _angle = 0) {
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

  let yStart = _yOffset;

  for (let y = 0; y < mountainLayerCount; y++) {
    yStart += mountainLayerOffset * random(0.2, 1.0);

    let mountainUpperPoints = [];
    let mountainLowerPoints = [];

    let xStart = -0.7 * width;
    let xEnd = 0.7 * width;

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

      let drawInMask = random(0, 1) < 0.48;

      if (drawInMask) {
        tint(255, random(0, 255), 255);
        collager.redrawVertexShapeInsideMask();
      }
    })

    await sleep(100);
  }
}

async function drawSkyLayer (_fromHeight, _toHeight, _angle = 0) {
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

  let skyRotationNoiseScale = random(0.0001, 0.0012);
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

      let drawInMask = random(0, 1) < 0.12;
      if (drawInMask) {
        tint(255, random(0, 255), 255);
        collager.redrawRectInsideMask(posX, posY, sizeW, sizeH, angleDegree);
      }
      pop();
    });


    if (i % 10 == 0) {
      await sleep(16);
    }
  }

}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
