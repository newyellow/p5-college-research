// get url parameters
const urlParams = new URLSearchParams(window.location.search);

const seed = urlParams.get('seed') || Math.random() * 100000000;
const p1 = parseFloat(urlParams.get('p1') || Math.random());
const p2 = parseFloat(urlParams.get('p2') || Math.random());
const p3 = parseFloat(urlParams.get('p3') || Math.random());

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

// for creating breathing effect
let bufferLayerBG;
let bufferLayerBottleInner;
let bufferLayerBottleStroke;

let bufferLayersComposite;
let bufferLayerEffectResult;
let bufferLayerHoleEffectResult;
let bufferLayerEffectMask;

let bufferLayerBottleHole;

let effectStrength = 0.0;
let effectTimeCounter = 0.0;

// collager
let collager;

let mainHue = 0;
let rectBaseSize = 0;
let baseThickness = 0;
let sizeVariation = 0;

let bottleIndex = 0;
let bottleScale = 0.6;
let bottleRotation = 0;

const density = urlParams.get('density') || 1;

async function setup() {
  _renderer = createCanvas(1080, 1920, WEBGL);
  pixelDensity(parseFloat(density));
  flex();
  fontResource = await loadFont('../fonts/Monospace.ttf');
  frameRate(60);
  colorMode(HSB);

  background(0);

  seedPRNG(seed);

  // init buffers
  bufferLayerBG = createFramebuffer();
  bufferLayerBottleInner = createFramebuffer();
  bufferLayerBottleStroke = createFramebuffer();
  bufferLayerBottleHole = createFramebuffer();
  bufferLayerEffectMask = createFramebuffer();

  bufferLayersComposite = createFramebuffer();
  bufferLayerEffectResult = createFramebuffer();
  bufferLayerHoleEffectResult = createFramebuffer();

  // init collager
  collager = new Collager();
  await collager.initSystem();

  // set lut according to p1
  let lutPath = getLUTPath(p1);
  let lutTexture = await loadImage("../" + lutPath);
  collager.setLutTexture(lutTexture);
  collager.setLutIntensity(0.66);

  bottleIndex = subtype;

  bottleScale = random(0.66, 1.1);
  // bottleRotation = random(-20, 20);

  drawBottle(bottleIndex);

  // let testBufferA = createFramebuffer();
  // await collager.addImage('images/A_bg.jpg', 0.2, 0.4);

  // testBufferA.draw(() => collager.drawRect(0, 0, 300, 300));

  // imageMode(CENTER);
  // image(testBufferA, 0, 0);

}


async function drawBottle(bottleIndex) {
  // load bg materials
  if (bottleIndex == 0) {
    await collager.addImage('images/A_bg.jpg', 0.2, 0.4);
    await loadBottleACurve();
  }
  else if (bottleIndex == 1) {
    await collager.addImage('images/B_bg.jpg', 0.2, 0.4);
    await loadBottleBCurve();
  }
  else if (bottleIndex == 2) {
    await collager.addImage('images/C_bg.jpg', 0.2, 0.4);
    await loadBottleCCurve();
  }

  push();
  {
    background(0, 0, 0);

    let pieceCount = 300 * p2AmountMult;

    // bg collager settings
    collager.cutoutThickness(30);
    collager.cutoutNoiseScale(0.1);

    collager.outlineWeight(120);
    collager.outlineNoiseScale(0.6);
    collager.outlineRatio(0.1, 0.9);

    collager.rectRoundness(random(0, 60));
    collager.rectPointCount(floor(random(10, 60)));
    collager.rectNoiseScale(0.036);
    collager.rectEdgeOffset(30);

    collager.shadow(10, 10, 12, [0, 0, 0], 0.4);


    for (let i = 0; i < pieceCount; i++) {
      let posX = random(-width / 2, width / 2);
      let posY = random(-height / 2, height / 2);

      let sizeX = random(100, 300) * p2SizeMult * random(p3SizeVarMin, p3SizeVarMax);
      let sizeY = random(100, 300) * p2SizeMult * random(p3SizeVarMin, p3SizeVarMax);

      let angleDegree = random(-p3RotRange, p3RotRange);

      let shadowOffset = random(3, 12);
      collager.shadowOffset(shadowOffset, shadowOffset);

      // draw on colorful
      bufferLayerBG.draw(() => {
        collager.drawRect(posX, posY, sizeX, sizeY, angleDegree);
      });

      // draw mask stuff
      bufferLayerEffectMask.draw(() => {
        tint(0, 0, 0);
        collager.redrawRectOutlineMask(posX, posY, sizeX, sizeY, angleDegree);
      });

      if (random(0, 1) < 0.36) {
        bufferLayerEffectMask.draw(() => {
          colorMode(RGB);
          tint(255, random(0, 255), 255);
          collager.redrawRectInsideMask(posX, posY, sizeX, sizeY, angleDegree);
          colorMode(HSB);
        });
      }

      imageMode(CENTER);
      image(bufferLayerBG, 0, 0, width, height);

      await collager.sync();
    }
  }
  pop();

  // inner
  if (bottleIndex == 0) {
    await drawBottleAInner();
  }
  else if (bottleIndex == 1) {
    await drawBottleBInner();

    // draw ears
    await drawBottleBEars();
  }
  else if (bottleIndex == 2) {
    await drawBottleCInner();
  }

  let strokeNoiseScale = random(0.01, 0.3);
  let strokeSampleCount = random(60, 360);
  let strokeThickness = random(6, 24);

  bufferLayerBottleStroke.draw(() => {
    push();
    scale(bottleScale);
    rotate(radians(bottleRotation));

    noStroke();
    fill(0, 0, 0);
    drawCurveStroke(5, strokeThickness, strokeNoiseScale, strokeSampleCount);

    if (bottleIndex == 2) {
      strokeThickness *= 0.66;
      drawTargetCurveStroke(curveReaders[1], strokeThickness, strokeNoiseScale, strokeSampleCount);
    }
    pop();
  });

  startBreathingEffect();
}

async function drawBottleAInner() {
  // draw inside
  collager.clearImages();
  await collager.addImage('images/A_snow.JPG', 0.2, 0.6);

  push();
  {
    let pieceCount = 220 * p2AmountMult;
    for (let i = 0; i < pieceCount; i++) {
      let posX = random(-width / 2, width / 2);
      let posY = random(-height / 2, height / 2);

      let baseSize = 216 * p2SizeMult;
      let sizeX = random(baseSize, baseSize * 2) * random(p3SizeVarMin, p3SizeVarMax);
      let sizeY = random(baseSize, baseSize * 2) * random(p3SizeVarMin, p3SizeVarMax);

      let angleDegree = random(-p3RotRange, p3RotRange);

      let shadowOffset = random(3, 12);
      collager.shadowOffset(shadowOffset, shadowOffset);

      bufferLayerBottleInner.draw(() => {
        collager.drawRect(posX, posY, sizeX, sizeY, angleDegree);
      });

      imageMode(CENTER);
      image(bufferLayerBG, 0, 0, width, height);

      push();
      scale(bottleScale);
      rotate(radians(bottleRotation));

      maskBottleBody();
      image(bufferLayerBottleInner, 0, 0, width, height);
      pop();

      await collager.sync();
    }
  }
  pop();

  // trees
  collager.setLutIntensity(0.24);
  collager.clearImages();
  await collager.addImage('images/A_tree_01.jpg', 0.36, 0.8);
  await collager.addImage('images/A_tree_02.jpg', 0.36, 0.8);

  push();
  {
    let pieceCount = int(random(2, 7) * p2AmountMult);
    for (let i = 0; i < pieceCount; i++) {
      let posX = random(-width / 2, width / 2);

      // Restrict posY to the upper half of the bottle
      // (from -height/2 to 0, or slightly below 0 for some spread)
      let minY = -height / 2;
      let maxY = height / 2 - 200;
      let posY = random(minY, maxY);

      let sizeX = random(300, 600) * p2SizeMult * random(p3SizeVarMin, p3SizeVarMax);
      let sizeY = random(400, 800) * p2SizeMult * random(p3SizeVarMin, p3SizeVarMax);

      let angleDegree = random(-p3RotRange, p3RotRange);

      let shadowOffset = random(3, 12);
      collager.shadowOffset(shadowOffset, shadowOffset);

      bufferLayerBottleInner.draw(() => {
        collager.drawRect(posX, posY, sizeX, sizeY, angleDegree);
      });

      imageMode(CENTER);
      image(bufferLayerBG, 0, 0, width, height);

      push();
      scale(bottleScale);
      rotate(radians(bottleRotation));

      maskBottleBody();
      image(bufferLayerBottleInner, 0, 0, width, height);
      pop();

      await collager.sync();
    }
  }
  pop();
}


async function drawBottleBInner() {
  // draw inside
  collager.clearImages();
  await collager.addImage('images/B_tree.jpg', 0.2, 0.6);

  // background layer
  push();
  {
    let pieceCount = int(86 * p2AmountMult);

    collager.rectPointCount(240);
    collager.rectNoiseScale(0.012);
    collager.rectEdgeOffset(36);
    collager.rectRoundness(40);

    collager.outlineWeight(12);

    collager.noShadow();

    for (let i = 0; i < pieceCount; i++) {
      let posX = random(-width / 2, width / 2);
      let posY = random(-height / 2, height / 2);

      let sizeX = random(120, 480) * 0.84 * p2SizeMult * random(p3SizeVarMin, p3SizeVarMax);
      let sizeY = random(120, 480) * 0.696 * p2SizeMult * random(p3SizeVarMin, p3SizeVarMax);

      let angleDegree = random(-p3RotRange, p3RotRange);

      let shadowOffset = random(3, 12);
      collager.shadowOffset(shadowOffset, shadowOffset);

      bufferLayerBottleInner.draw(() => {
        collager.drawRect(posX, posY, sizeX, sizeY, angleDegree);
      });

      imageMode(CENTER);
      image(bufferLayerBG, 0, 0, width, height);

      push();
      scale(bottleScale);
      rotate(radians(bottleRotation));

      maskBottleBody();
      image(bufferLayerBottleInner, 0, 0, width, height);
      pop();

      await collager.sync();
    }
  }
  // pop();

  // draw fixed image on the bottle
  {
    collager.clearImages();
    await collager.addImage('images/B_sky.jpeg', 0.6, 0.9);

    let skyPosX = 0;
    let skySizeX = 1024;
    let skySizeY = random(240, 600);

    let skyPosY = -600 + skySizeY / 2;
    
    let skyAngle = random(-6, 6);

    bufferLayerBottleInner.draw(() => {
      collager.drawRect(skyPosX, skyPosY, skySizeX, skySizeY, skyAngle);
    });

    // draw the stone artifact
    let stoneImg = await loadImage('artifact/text_board.jpg');
    let stoneCurveJson = await loadJSON('artifact/text_board.json');
    let stoneSet = new CroppedImageSet(stoneImg, stoneCurveJson);

    let stonePosX = 0
    let stoneSize = random(240, 600) * p2SizeMult * random(p3SizeVarMin, p3SizeVarMax);
    let stonePosY = -600 + stoneSize / 2;
    let stoneAngle = random(-6, 6);

    bufferLayerBottleInner.draw(() => {
      collager.drawMaskedImage(
        stoneSet.imageData,
        stoneSet.curveData,
        stonePosX,
        stonePosY,
        stoneSize,
        stoneAngle
      );
    });

  }

  // draw ducks
  // push();
  {
    // maskBottleBody();

    let duckImgs = [];
    duckImgs.push(await loadImage('images/duck-rainbow.png'));
    duckImgs.push(await loadImage('images/duck-cloth.png'));
    duckImgs.push(await loadImage('images/duck-cook.png'));
    duckImgs.push(await loadImage('images/duck-jade-origin.png'));
    duckImgs.push(await loadImage('images/duck-jade.png'));
    duckImgs.push(await loadImage('images/duck-metal.png'));
    duckImgs.push(await loadImage('images/duck-water.png'));

    // duck spawn parameters
    let duckSpawnCenterX = 0;
    let duckSpawnCenterY = 200; // Center of the circular spawn area
    let duckSpawnRadiusMin = 200;
    let duckSpawnRadiusMax = duckSpawnRadiusMin * 3;
    let duckSpawnAngleMin = -45; // Starting angle in degrees
    let duckSpawnAngleMax = 225; // Ending angle in degrees

    let duckCount = int(13 * p2AmountMult);

    // Evenly spread ducks along the arc, distribute radius and angle evenly
    for (let i = 0; i < duckCount; i++) {
      let duckImg = duckImgs[int(random(0, duckImgs.length))];

      let duckSize = 204 * p2SizeMult * random(p3SizeVarMin, p3SizeVarMax);

      // Evenly spaced angle along the arc
      let t = duckCount > 1 ? i / (duckCount - 1) : 0.5;
      let spawnAngle = lerp(duckSpawnAngleMin, duckSpawnAngleMax, t);

      // Optionally, space the radius a bit for more spread
      let spawnRadius = random(duckSpawnRadiusMin, duckSpawnRadiusMax);

      let duckPosX = duckSpawnCenterX + spawnRadius * cos(radians(spawnAngle));
      let duckPosY = duckSpawnCenterY + spawnRadius * sin(radians(spawnAngle));

      let duckAngle = spawnAngle + random(-p3RotRange, p3RotRange);

      bufferLayerBottleInner.draw(() => {
        push();
        translate(duckPosX, duckPosY);
        rotate(radians(duckAngle));
        imageMode(CENTER);
        image(duckImg, 0, 0, duckSize, duckSize);
        pop();
      });

      imageMode(CENTER);
      image(bufferLayerBG, 0, 0, width, height);

      push();
      scale(bottleScale);
      rotate(radians(bottleRotation));

      maskBottleBody();
      image(bufferLayerBottleInner, 0, 0, width, height);
      pop();

      await collager.sync();
    }
  }
  pop();
}

async function drawBottleBEars() {
  let leftEarImg = await loadImage('artifact/bottle_ear_left.jpg');
  let leftEarCurve = await loadJSON('artifact/bottle_ear_left.json');
  let rightEarImg = await loadImage('artifact/bottle_ear_right.jpg');
  let rightEarCurve = await loadJSON('artifact/bottle_ear_right.json');

  let earSize = 300; 
  let earY = -360;
  let earXOffset = 330;

  collager.shadow(10, 10, 20, [0, 0, 0, 0.5]);

  // Draw to BG buffer (the color layer)
  bufferLayerBG.draw(() => {
    push();
    scale(bottleScale);
    rotate(radians(bottleRotation));
    collager.drawMaskedImage(leftEarImg, leftEarCurve, -earXOffset, earY, earSize, 0);
    collager.drawMaskedImage(rightEarImg, rightEarCurve, earXOffset, earY, earSize, 0);
    pop();
  });

  // Draw to Effect Mask buffer to occlude background breathing
  bufferLayerEffectMask.draw(() => {
    push();
    scale(bottleScale);
    rotate(radians(bottleRotation));
    
    // Left ear occlusion
    collager.drawMaskedImage(leftEarImg, leftEarCurve, -10000, -10000, earSize, 0); // prepare
    tint(0, 0, 0);
    collager.redrawMaskedImageOutlineMask(-earXOffset, earY, 0);
    
    // Right ear occlusion
    collager.drawMaskedImage(rightEarImg, rightEarCurve, -10000, -10000, earSize, 0); // prepare
    tint(0, 0, 0);
    collager.redrawMaskedImageOutlineMask(earXOffset, earY, 0);
    
    pop();
  });
}

async function drawBottleCInner() {
  // draw inside
  collager.clearImages();
  if(random(0, 1) < 0.5) {
  await collager.addImage('images/C_sky_01.jpg', 0.12, 0.6);
  await collager.addImage('images/C_sky_02.jpg', 0.12, 0.6);
  } else {
  await collager.addImage('images/C_bottle_pattern.jpg', 0.12, 0.6);
  }

  push();
  {
    let pieceCount = 200 * p2AmountMult;
    for (let i = 0; i < pieceCount; i++) {
      let posX = random(-width / 2, width / 2);
      let posY = random(-height / 2, height / 2);

      let sizeX = random(120, 480) * p2SizeMult * random(p3SizeVarMin, p3SizeVarMax);
      let sizeY = random(120, 480) * p2SizeMult * random(p3SizeVarMin, p3SizeVarMax);

      let angleDegree = random(-p3RotRange, p3RotRange);

      let shadowOffset = random(3, 12);
      collager.shadowOffset(shadowOffset, shadowOffset);

      bufferLayerBottleInner.draw(() => {
        collager.drawRect(posX, posY, sizeX, sizeY, angleDegree);
      });

      imageMode(CENTER);
      image(bufferLayerBG, 0, 0, width, height);

      push();
      scale(bottleScale);
      rotate(radians(bottleRotation));

      maskBottleBody();
      image(bufferLayerBottleInner, 0, 0, width, height);
      pop();

      if (i % 6 == 0)
        await sleep(16);
    }
  }
  pop();

  // draw hole center
  push();
  {
    let islandImgUrls = [];
    islandImgUrls.push('images/C_island_1.jpg');
    islandImgUrls.push('images/C_island_2.jpg');
    islandImgUrls.push('images/C_island_3.jpg');
    islandImgUrls.push('images/C_island_4.jpg');
    islandImgUrls.push('images/C_island_5.jpg');

    let randomIslandIndex = int(random(0, islandImgUrls.length));
    let islandImg = await loadImage(islandImgUrls[randomIslandIndex]);
    let islandSize = random(320, 480);

    bufferLayerBottleHole.draw(() => {
      push();
      imageMode(CENTER);
      image(islandImg, 0, 320, islandSize, islandSize);
      pop();
    });

    // Draw hole area to effect mask so it breathes
    bufferLayerEffectMask.draw(() => {
      push();
      colorMode(RGB);
      tint(255, random(0, 255), 255);
      noStroke();
      beginShape();
      drawCurveVertex(curveReaders[1]);
      endShape(CLOSE);
      pop();
    });
  }
  pop();
}

async function startBreathingEffect() {
  // do breathing effect
  let breathingShader = await loadShader(
    "../shaders/uniform.vert",
    "../shaders/effect_02.frag"
  );

  let startTime = millis();

  effectTimeCounter = 0.0;
  effectStrength = 0.0;

  // loop draw
  while (true) {
    bufferLayerEffectResult.draw(() => {
      shader(breathingShader);
      breathingShader.setUniform("width", 1080.0);
      breathingShader.setUniform("height", 1920.0);
      breathingShader.setUniform("time", (millis() - startTime) / 1000.0);
      breathingShader.setUniform("uresolution", [width, height]);

      breathingShader.setUniform("utexture", bufferLayerBG);
      breathingShader.setUniform("uMaskTexture", bufferLayerEffectMask);
      breathingShader.setUniform("flipV", false);
      breathingShader.setUniform("uEffectStrength", effectStrength);

      effectStrength = easeInOutSine(constrain(effectTimeCounter, 0.0, 1.0));
      effectTimeCounter += deltaTime / 3600.0;

      noStroke();
      rect(0, 0, width, height);
    });

    // Also apply breathing to the hole layer if needed
    if (bottleIndex == 2) {
      bufferLayerHoleEffectResult.draw(() => {
        shader(breathingShader);
        breathingShader.setUniform("width", 1080.0);
        breathingShader.setUniform("height", 1920.0);
        breathingShader.setUniform("time", (millis() - startTime) / 1000.0);
        breathingShader.setUniform("uresolution", [width, height]);

        breathingShader.setUniform("utexture", bufferLayerBottleHole);
        breathingShader.setUniform("uMaskTexture", bufferLayerEffectMask);
        breathingShader.setUniform("flipV", false);
        breathingShader.setUniform("uEffectStrength", effectStrength * 0.36);

        noStroke();
        rect(0, 0, width, height);
      });
    }

    imageMode(CENTER);
    image(bufferLayerEffectResult, 0, 0, width, height);

    push();
    {
      scale(bottleScale);
      rotate(radians(bottleRotation));

      push();
      {
        maskBottleBody();
        image(bufferLayerBottleInner, 0, 0, width, height);
      }
      pop();

      // hole
      push();
      if (bottleIndex == 2) {
        maskBottleHole();
        image(bufferLayerHoleEffectResult, 0, 0, width, height);
      }
      pop();
    }
    pop();
    image(bufferLayerBottleStroke, 0, 0, width, height);

    await collager.sync();
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
