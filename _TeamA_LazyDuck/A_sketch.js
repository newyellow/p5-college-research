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
  collager.setLutIntensity(1.0);

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

  let rows = 6;
  let cols = 5;
  let landWidth = width * 1.5; // Wider to account for rotation
  let landHeight = _toHeight - _fromHeight;
  
  let stepX = landWidth / cols;
  let stepY = landHeight / rows;

  let skewAmount = 0.4; // perspective skew

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let isVertical = random() > 0.5;
      
      // Calculate corner points of the field (parallelogram)
      let getPos = (col, row) => {
        let x = -landWidth / 2 + col * stepX + (row / rows) * landWidth * skewAmount;
        let y = _fromHeight + row * stepY;
        return { x, y };
      };

      let p00 = getPos(c, r);
      let p10 = getPos(c + 1, r);
      let p01 = getPos(c, r + 1);
      let p11 = getPos(c + 1, r + 1);

      // Fill the field with hatch lines
      let density = 15;
      for (let i = 0; i < density; i++) {
        let t = i / (density - 1);
        
        let startP, endP;
        if (isVertical) {
          // Horizontal lines (spanning across)
          startP = { x: lerp(p00.x, p01.x, t), y: lerp(p00.y, p01.y, t) };
          endP = { x: lerp(p10.x, p11.x, t), y: lerp(p10.y, p11.y, t) };
        } else {
          // Vertical lines (spanning down)
          startP = { x: lerp(p00.x, p10.x, t), y: lerp(p00.y, p10.y, t) };
          endP = { x: lerp(p01.x, p11.x, t), y: lerp(p01.y, p11.y, t) };
        }

        let posX = (startP.x + endP.x) / 2;
        let posY = (startP.y + endP.y) / 2;
        let sizeW = dist(startP.x, startP.y, endP.x, endP.y);
        let sizeH = random(8, 15);
        let angle = degrees(atan2(endP.y - startP.y, endP.x - startP.x));

        push();
        rotate(radians(_angle));
        collager.drawRect(posX, posY, sizeW, sizeH, angle);
        pop();

        bufferLayerColorful.draw(() => {
          push();
          rotate(radians(_angle));
          collager.redrawRect(posX, posY, sizeW, sizeH, angle);
          pop();
        });

        bufferLayerMask.draw(() => {
          push();
          rotate(radians(_angle));
          colorMode(RGB);
          tint(0, 0, 0);
          collager.redrawRectOutlineMask(posX, posY, sizeW, sizeH, angle);

          let drawInMask = random(0, 1) < 0.2;
          if (drawInMask) {
            tint(255, random(0, 255), 255);
            collager.redrawRectInsideMask(posX, posY, sizeW, sizeH, angle);
          }
          pop();
        });
      }
      
      await sleep(50);
    }
  }
}

async function drawSeaLayer(_fromHeight, _toHeight, _angle = 0) {
  collager.clearImages();
  await collager.addImage('images/sea_01.jpg', 0.1, 0.4);

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
