// this is a p5js v2 script
let _renderer = null;

let modelData = null;
let fullScreenModel = null;
let fullScreenModelData = null;

let shaderProgram;
let outlineShaderProgram;
let shadowShaderProgram;

let photoTexture = null;
let transparentTexture = null;


let collager = null;

async function setup() {
  _renderer = createCanvas(1080, 1920, WEBGL);

  // set to orthographic projection
  colorMode(HSB);
  rectMode(CENTER);
  imageMode(CENTER);

  background(0, 0, 30);

  collager = new Collager();
  await collager.initShaders();

  // can add images, and set the random scale (how much croped from the original image)
  await collager.addImage('images/test-photo-4.jpg', 0.1, 0.3);
  await collager.addImage('images/test-photo-5.jpg', 0.1, 0.4);
  await collager.addImage('images/test-photo-6.jpg', 0.1, 0.3);

  // set outline thickness
  collager.outlineWeight(2);
  collager.outlineNoiseScale(1.0);

  let gridX = 36;
  let gridY = 4;

  let rectWidth = width / gridX;
  let rectHeight = height / gridY;

  for(let y = 0; y < gridY; y++) {
    // Create randomized x indices
    let xIndices = [];
    for(let i=0; i<gridX + 20; i++) xIndices.push(i - 10);
    shuffle(xIndices, true);

    for(let i = 0; i < xIndices.length; i++) {
      let x = xIndices[i];

      let sizeW = rectWidth * random(1.2, 2.4);
      let sizeH = rectHeight * random(1.2, 2.4);
      
      let posX = -width / 2 + rectWidth * (x + 0.5) + random(-rectWidth * 0.1, rectWidth * 0.1);
      let posY = -height / 2 + rectHeight * (y + 0.5) + random(-rectHeight * 0.1, rectHeight * 0.1) - 360;

      let rotateNoiseValue = noise(posX * 0.01, posY * 0.01);
      let rotateDeg = map(rotateNoiseValue, 0, 1, -12, 12);

      collager.drawImage(posX, posY, sizeW, sizeH, rotateDeg);

      await sleep(16);
    }
  }

  

  

  // change image set
  collager.clearImages();

  await collager.addImage('images/test-photo-1.jpg', 0.3, 0.4);
  await collager.addImage('images/test-photo-2.jpg', 0.2, 0.6);
  await collager.addImage('images/test-photo-3.jpg', 0.2, 0.6);

  collager.outlineWeight(6);
  collager.outlineNoiseScale(3.0);

  // then just use drawImage to draw at position, size, rotation
  for (let i = 0; i < 36; i++) {
    let posX = random(-width / 2 - 100, width / 2 + 100);
    let posY = random(-height / 2 - 100, height / 2 + 100);
    let sizeW = random(100, 600);
    let sizeH = random(100, 600);
    let rotateDeg = random(-60, 60);

    collager.drawImage(posX, posY, sizeW, sizeH, rotateDeg);

    await sleep(16);
  }
  


  // clear();

  // image(collager.maskBuffer, -width/2, -height/2, width, height);

  // rect(0, 0, 400, 300);


  // image(collager.maskBuffer, 0, 0, width, height);


  // Create two framebuffers: one for outline pass, one for final AA output
  // let outlinePass = createFramebuffer();
  // let finalPass = createFramebuffer();

  // photoTexture = await loadImage('images/test-photo.jpg');
  // transparentTexture = await loadImage('images/piece-sample.png');

  // // Load the shader
  // shaderProgram = await loadShader('shader.vert', 'shader.frag');

  // // Load the outline shader
  // outlineShaderProgram = await loadShader('outline.vert', 'outline.frag');

  // // Load the shadow shader
  // shadowShaderProgram = await loadShader('shadow.vert', 'shadow.frag');

  // // Load the AA shader
  // let aaShaderProgram = await loadShader('antialiasing.vert', 'antialiasing.frag');


  // let rectX = -400;
  // let rectY = -400;

  // let rectWidth = 600;
  // let rectHeight = 600;

  // let pLeftTop = new NYPoint(rectX, rectY, 0, 0);
  // let pRightTop = new NYPoint(rectX + rectWidth, rectY, 1, 0);
  // let pLeftBottom = new NYPoint(rectX, rectY + rectHeight, 0, 1);
  // let pRightBottom = new NYPoint(rectX + rectWidth, rectY + rectHeight, 1, 1);

  // let newModel = new NYModel('test');
  // newModel.addTriangleByPoints(pLeftTop, pRightTop, pLeftBottom);
  // newModel.addTriangleByPoints(pRightTop, pRightBottom, pLeftBottom);
  // modelData = newModel.build();

  // fullScreenModel = new NYModel('fullscreen');
  // let fLeftTop = new NYPoint(-0.5 * width, -0.5 * height, 0, 0);
  // let fRightTop = new NYPoint(0.5 * width, -0.5 * height, 1, 0);
  // let fLeftBottom = new NYPoint(-0.5 * width, 0.5 * height, 0, 1);
  // let fRightBottom = new NYPoint(0.5 * width, 0.5 * height, 1, 1);

  // fullScreenModel.addTriangleByPoints(fLeftTop, fRightTop, fLeftBottom);
  // fullScreenModel.addTriangleByPoints(fRightTop, fRightBottom, fLeftBottom);
  // // build for _renderer (main canvas) to be safe
  // fullScreenModelData = fullScreenModel.build(_renderer);

  // Use AA shader on the main canvas
  // outlinePass.begin(); // Don't draw back into the same buffer, use the final buffer or main canvas

  // We need to ping-pong if we want to apply multiple passes, or just draw to main canvas
  // But wait, the previous step 'outlinePass' contains the result of outline shader?
  // NO, wait. 
  // Step 1: outlinePass contains the Image
  // Step 2: outlinePass.begin() -> Shader(outline) -> draws rect -> outlinePass now contains OUTLINED image.
  //         Wait, if we draw into outlinePass WHILE reading from outlinePass (uMainTexture), that's undefined behavior in many GL contexts (feedback loop).
  //         We should use a second buffer for the outline result.

  // Let's fix the pipeline:
  // 1. Draw original image to 'outlinePass'
  // 2. Draw 'outlinePass' (texture) -> 'finalPass' (framebuffer) using Outline Shader
  // 3. Draw 'finalPass' (texture) -> Main Canvas using AA Shader

  // --- STEP 1: DRAW IMAGE ---
  // outlinePass.begin();
  // clear();
  // image(transparentTexture, -300, -300, 600, 600);
  // outlinePass.end();

  // --- STEP 2: APPLY OUTLINE ---
  // outlinePass.begin();
  // shader(outlineShaderProgram);
  // outlineShaderProgram.setUniform('uMainTexture', outlinePass);
  // outlineShaderProgram.setUniform('uTextureSize', [width, height]);
  // outlineShaderProgram.setUniform('uMeshSize', [width, height]);
  // outlineShaderProgram.setUniform('uOutlineColor', [1.0, 1.0, 1.0, 1.0]);
  // outlineShaderProgram.setUniform('uOutlineThickness', 24.0);
  // outlineShaderProgram.setUniform('uEdgeThreshold', 0.4);
  // outlineShaderProgram.setUniform('uNoiseXOffset', 0.0);
  // outlineShaderProgram.setUniform('uNoiseYOffset', 0.0);
  // outlineShaderProgram.setUniform('uNoiseScaleX', 10.0);
  // outlineShaderProgram.setUniform('uNoiseScaleY', 10.0);
  // outlineShaderProgram.setUniform('uNoiseWeight', 0.0);

  // noStroke();
  // rect(-width/2, -height/2, width, height);
  // outlinePass.end();

  // // --- STEP 3: APPLY AA ---
  // finalPass.begin();
  // clear();
  // shader(aaShaderProgram);
  // aaShaderProgram.setUniform('uMainTexture', outlinePass);
  // aaShaderProgram.setUniform('uTextureSize', [width, height]);
  // aaShaderProgram.setUniform('uStrength', 0.5); // 0.0 - 1.0 mix
  // aaShaderProgram.setUniform('uStepSize', 2.0); // Blur radius

  // noStroke();
  // rect(-width/2, -height/2, width, height);
  // finalPass.end();

  // // Finally, draw the final result to the main canvas
  // clear();
  // image(finalPass, -width/2, -height/2, width, height);

}

function draw() {

  // Apply the shader
  // shader(shaderProgram);
  // shaderProgram.setUniform('uMainTexture', photoTexture);

  // model(modelData);
  // // Draw the geometry
  // if (modelData) {
  //   model(modelData);
  // }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
