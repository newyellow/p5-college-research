// get url parameters
const urlParams = new URLSearchParams(window.location.search);

const seed = urlParams.get('seed') || Math.random() * 100000000;
const p1 = urlParams.get('p1') || Math.random();
const p2 = urlParams.get('p2') || Math.random();
const p3 = urlParams.get('p3') || Math.random();
const p4 = urlParams.get('p4') || Math.random();

// this is a p5js v2 script
let _renderer = null;
let fontResource = null;

// for creating breathing effect
let bufferLayerColorful;
let bufferLayerMask;
let INCLUDE_OUTLINE_IN_MASK = false;

// collager
let collager;


let mainHue = 0;
let rectBaseSize = 0;
let baseThickness = 0;
let sizeVariation = 0;

let layerBg;
let layerBottleStroke;
let layerBottleInner;
let layerBottleHole;
let layerBreathingMask;

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
  bufferLayerColorful = createFramebuffer();
  bufferLayerMask = createFramebuffer();


  // init collager
  collager = new Collager();
  await collager.initSystem();

  let bottleIndex = int(random(0, 3));


  if (bottleIndex == 0)
    drawBottleA();
  else if (bottleIndex == 1)
    drawBottleB();
  else if (bottleIndex == 2)
    drawBottleC();

  // let testBufferA = createFramebuffer();
  // await collager.addImage('images/A_bg.jpg', 0.2, 0.4);

  // testBufferA.draw(() => collager.drawRect(0, 0, 300, 300));

  // imageMode(CENTER);
  // image(testBufferA, 0, 0);

}


async function drawBottleA() {
  // load bg materials
  await collager.addImage('images/A_bg.jpg', 0.2, 0.4);

  await loadBottleACurve();

  push();
  {
    maskBottleBG();

    background(0, 0, 0);

    let pieceCount = 1000;

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


      // mask stuff
      let drawInMask = random(0, 1) < 0.12;
      if (drawInMask || INCLUDE_OUTLINE_IN_MASK) {
        collager.outlineInMask(!drawInMask || INCLUDE_OUTLINE_IN_MASK);
      }

      // draw rect
      collager.drawRect(posX, posY, sizeX, sizeY, angleDegree);

      if (drawInMask) {
        bufferLayerMask.draw(() => {
          tint(0, 0, 100);
          collager.redrawRectMask(posX, posY, sizeX, sizeY, angleDegree);
        });
      }
      else {
        bufferLayerMask.draw(() => {
          tint(0, 0, 0);
          collager.redrawRectMask(posX, posY, sizeX, sizeY, angleDegree);
        });
      }

      if (i % 6 == 0)
        await sleep(16);
    }
  }
  pop();

  // draw inside
  collager.clearImages();
  await collager.addImage('images/A_snow.JPG', 0.2, 0.6);
  await collager.addImage('images/A_tree.JPG', 0.2, 0.6);
  await collager.addImage('images/A_train.JPG', 0.2, 0.6);

  push();
  {
    maskBottleBody();

    let pieceCount = 800;
    for (let i = 0; i < pieceCount; i++) {
      let posX = random(-width / 2, width / 2);
      let posY = random(-height / 2, height / 2);

      let sizeX = random(100, 600);
      let sizeY = random(100, 600);

      let angleDegree = random(-180, 180);

      let shadowOffset = random(3, 12);
      collager.shadowOffset(shadowOffset, shadowOffset);
      
      collager.drawRect(posX, posY, sizeX, sizeY, angleDegree);

      if (i % 6 == 0)
        await sleep(16);
    }
  }
  pop();

  noStroke();
  fill(0, 0, 0);

  let strokeNoiseScale = random(0.001, 0.01);
  let strokeSampleCount = int(random(100, 2000));
  let strokeThickness = random(12, 48);
  drawCurveStroke(5, strokeThickness, strokeNoiseScale, strokeSampleCount);

  bufferLayerMask.draw(() => {
    noStroke();
    fill(0, 0, 0);
    drawCurveStroke(5, strokeThickness, strokeNoiseScale, strokeSampleCount);
  });

  let canvasSnapshot = get();

  // draw the current canvas on colorful buffer
  bufferLayerColorful.draw(() => {
    imageMode(CENTER);
    image(canvasSnapshot, 0, 0, width, height);
  });
  

  startBreathingEffect();
}

async function drawBottleB() {
  // load bg materials
  await collager.addImage('images/B_bg.jpg', 0.2, 0.4);

  await loadBottleBCurve();

  push();
  {
    maskBottleBG();

    background(0, 0, 0);

    let pieceCount = 1000;

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

      // mask stuff
      let drawInMask = random(0, 1) < 0.12;
      if (drawInMask || INCLUDE_OUTLINE_IN_MASK) {
        collager.outlineInMask(!drawInMask || INCLUDE_OUTLINE_IN_MASK);
      }

      collager.drawRect(posX, posY, sizeX, sizeY, angleDegree);

      if (drawInMask) {
        bufferLayerMask.draw(() => {
          tint(0, 0, 100);
          collager.redrawRectMask(posX, posY, sizeX, sizeY, angleDegree);
        });
      }
      else {
        bufferLayerMask.draw(() => {
          tint(0, 0, 0);
          collager.redrawRectMask(posX, posY, sizeX, sizeY, angleDegree);
        });
      }

      if (i % 6 == 0)
        await sleep(16);
    }
  }
  pop();

  // draw inside
  collager.clearImages();
  await collager.addImage('images/B_tree.jpg', 0.2, 0.6);
  await collager.addImage('images/B_stone.jpg', 0.2, 0.6);
  await collager.addImage('images/B_cloud.jpg', 0.2, 0.6);

  push();
  {
    maskBottleBody();

    let pieceCount = 800;
    for (let i = 0; i < pieceCount; i++) {
      let posX = random(-width / 2, width / 2);
      let posY = random(-height / 2, height / 2);

      let sizeX = random(120, 480);
      let sizeY = random(120, 480);

      let angleDegree = random(-180, 180);

      let shadowOffset = random(3, 12);
      collager.shadowOffset(shadowOffset, shadowOffset);

      collager.drawRect(posX, posY, sizeX, sizeY, angleDegree);

      if (i % 6 == 0)
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

      push();
      translate(duckPosX, duckPosY);
      rotate(radians(duckAngle));
      image(duckImg, 0, 0, duckSize, duckSize);
      pop();

      await sleep(16);
    }
  }
  // pop();

  noStroke();
  fill(0, 0, 0);

  let strokeNoiseScale = random(0.001, 0.01);
  let strokeSampleCount = int(random(100, 2000));
  let strokeThickness = random(12, 48);
  drawCurveStroke(5, strokeThickness, strokeNoiseScale, strokeSampleCount);

  bufferLayerMask.draw(() => {
    noStroke();
    fill(0, 0, 0);
    drawCurveStroke(5, strokeThickness, strokeNoiseScale, strokeSampleCount);
  });

  let canvasSnapshot = get();

  // draw the current canvas on colorful buffer
  bufferLayerColorful.draw(() => {
    imageMode(CENTER);
    image(canvasSnapshot, 0, 0, width, height);
  });

  startBreathingEffect();
}


async function drawBottleC() {
  // load bg materials
  await collager.addImage('images/C_bg.jpg', 0.2, 0.4);

  await loadBottleCCurve();

  push();
  {
    maskBottleBG();

    background(0, 0, 0);

    let pieceCount = 1000;

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

      // mask stuff
      let drawInMask = random(0, 1) < 0.12;
      if (drawInMask || INCLUDE_OUTLINE_IN_MASK) {
        collager.outlineInMask(!drawInMask || INCLUDE_OUTLINE_IN_MASK);
      }

      collager.drawRect(posX, posY, sizeX, sizeY, angleDegree);

      if (drawInMask) {
        bufferLayerMask.draw(() => {
          tint(0, 0, 100);
          collager.redrawRectMask(posX, posY, sizeX, sizeY, angleDegree);
        });
      }
      else {
        bufferLayerMask.draw(() => {
          tint(0, 0, 0);
          collager.redrawRectMask(posX, posY, sizeX, sizeY, angleDegree);
        });
      }

      if (i % 6 == 0)
        await sleep(16);
    }
  }
  pop();

  // draw inside
  collager.clearImages();
  await collager.addImage('images/C_flower_1.jpg', 0.2, 0.6);
  await collager.addImage('images/C_flower_2.jpg', 0.2, 0.6);
  await collager.addImage('images/C_flower_3.jpg', 0.2, 0.6);

  push();
  {
    maskBottleBody();

    let pieceCount = 800;
    for (let i = 0; i < pieceCount; i++) {
      let posX = random(-width / 2, width / 2);
      let posY = random(-height / 2, height / 2);

      let sizeX = random(120, 480);
      let sizeY = random(120, 480);

      let angleDegree = random(-180, 180);

      let shadowOffset = random(3, 12);
      collager.shadowOffset(shadowOffset, shadowOffset);

      collager.drawRect(posX, posY, sizeX, sizeY, angleDegree);

      if (i % 6 == 0)
        await sleep(16);
    }
  }
  pop();

  // draw center
  push();
  {
    maskBottleHole();

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

    imageMode(CENTER);
    image(islandImg, 0, 300, islandSize * islandImgRatio, islandSize);
  }
  pop();

  noStroke();
  fill(0, 0, 0);

  let strokeNoiseScale = random(0.001, 0.01);
  let strokeSampleCount = int(random(100, 2000));
  let strokeThickness = random(12, 48);
  drawCurveStroke(5, strokeThickness, strokeNoiseScale, strokeSampleCount);

  bufferLayerMask.draw(() => {
    noStroke();
    fill(0, 0, 0);
    drawCurveStroke(5, strokeThickness, strokeNoiseScale, strokeSampleCount);
  });

  let canvasSnapshot = get();

  // draw the current canvas on colorful buffer
  bufferLayerColorful.draw(() => {
    imageMode(CENTER);
    image(canvasSnapshot, 0, 0, width, height);
  });

  startBreathingEffect();

}

async function startBreathingEffect() {
  // do breathing effect
  let breathingShader = await loadShader(
    "../shaders/uniform.vert",
    "../shaders/effect_02.frag"
  );

  let startTime = millis();

  // loop draw
  while (true) {
    shader(breathingShader);
    breathingShader.setUniform("width", 1080.0);
    breathingShader.setUniform("height", 1920.0);
    breathingShader.setUniform("time", (millis() - startTime) / 1000.0);
    breathingShader.setUniform("uresolution", [width, height]);

    breathingShader.setUniform("utexture", bufferLayerColorful);
    breathingShader.setUniform("uMaskTexture", bufferLayerMask);
    breathingShader.setUniform("flipV", true);

    noStroke();
    rect(0, 0, width, height);

    await sleep(16);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
