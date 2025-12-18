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
let bufferLayerBG;
let bufferLayerBottleInner;
let bufferLayerBottleStroke;

let bufferLayersComposite;
let bufferLayerEffectResult;
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

async function setup() {
  _renderer = createCanvas(1080, 1920, WEBGL);
  flex();
  fontResource = await loadFont('../fonts/Monospace.ttf');
  frameRate(60);
  colorMode(HSB);

  background(0);

  randomSeed(seed);
  noiseSeed(seed);

  // init buffers
  bufferLayerBG = createFramebuffer();
  bufferLayerBottleInner = createFramebuffer();
  bufferLayerBottleStroke = createFramebuffer();
  bufferLayerBottleHole = createFramebuffer();
  bufferLayerEffectMask = createFramebuffer();

  bufferLayersComposite = createFramebuffer();
  bufferLayerEffectResult = createFramebuffer();

  // init collager
  collager = new Collager();
  await collager.initSystem();

  // set lut according to p1
  let lutPath = getLUTPath(p1);
  let lutTexture = await loadImage("../" + lutPath);
  collager.setLutTexture(lutTexture);
  collager.setLutIntensity(1.0);

  bottleIndex = int(random(0, 3));

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

    let pieceCount = 300;

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

      let sizeX = random(100, 300);
      let sizeY = random(100, 300);

      let angleDegree = random(-180, 180);

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

      await sleep(16);
    }
  }
  pop();

  // inner
  if (bottleIndex == 0) {
    await drawBottleAInner();
  }
  else if (bottleIndex == 1) {
    await drawBottleBInner();
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
  await collager.addImage('images/A_tree.JPG', 0.2, 0.6);
  await collager.addImage('images/A_train.JPG', 0.2, 0.6);

  push();
  {
    let pieceCount = 100;
    for (let i = 0; i < pieceCount; i++) {
      let posX = random(-width / 2, width / 2);
      let posY = random(-height / 2, height / 2);

      let sizeX = random(100, 600);
      let sizeY = random(100, 600);

      let angleDegree = random(-180, 180);

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

      await sleep(16);
    }
  }
  pop();
}


async function drawBottleBInner() {
  // draw inside
  collager.clearImages();
  await collager.addImage('images/B_tree.jpg', 0.2, 0.6);
  await collager.addImage('images/B_stone.jpg', 0.2, 0.6);
  await collager.addImage('images/B_cloud.jpg', 0.2, 0.6);

  push();
  {

    let pieceCount = 100;
    for (let i = 0; i < pieceCount; i++) {
      let posX = random(-width / 2, width / 2);
      let posY = random(-height / 2, height / 2);

      let sizeX = random(120, 480);
      let sizeY = random(120, 480);

      let angleDegree = random(-180, 180);

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

      await sleep(16);
    }
  }
  // pop();

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

    let duckCount = int(random(6, 24));

    for (let i = 0; i < duckCount; i++) {
      let duckImg = duckImgs[int(random(0, duckImgs.length))];

      let duckSize = random(100, 300);

      let duckPosX = random(-400, 400);
      let duckPosY = random(-300, 600);

      let duckAngle = random(-180, 180);

      bufferLayerBottleInner.draw(() => {
        push();
        translate(duckPosX, duckPosY);
        rotate(radians(duckAngle));
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

      await sleep(16);
    }
  }
  pop();
}


async function drawBottleCInner() {
  // draw inside
  collager.clearImages();
  await collager.addImage('images/C_flower_1.jpg', 0.2, 0.6);
  await collager.addImage('images/C_flower_2.jpg', 0.2, 0.6);
  await collager.addImage('images/C_flower_3.jpg', 0.2, 0.6);

  push();
  {

    let pieceCount = 200;
    for (let i = 0; i < pieceCount; i++) {
      let posX = random(-width / 2, width / 2);
      let posY = random(-height / 2, height / 2);

      let sizeX = random(120, 480);
      let sizeY = random(120, 480);

      let angleDegree = random(-180, 180);

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
    islandImgUrls.push('images/C_island_6.jpg');

    let randomIslandIndex = int(random(0, islandImgUrls.length));
    let islandImg = await loadImage(islandImgUrls[randomIslandIndex]);

    let islandImgRatio = islandImg.width / islandImg.height;
    let islandSize = random(300, 600);

    bufferLayerBottleHole.draw(() => {
      imageMode(CENTER);
      image(islandImg, 0, 300, islandSize * islandImgRatio, islandSize);
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
      if(bottleIndex == 2) {
        maskBottleHole();
        image(bufferLayerBottleHole, 0, 0, width, height);
      }
      pop();
    }
    pop();
    image(bufferLayerBottleStroke, 0, 0, width, height);

    await sleep(16);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
