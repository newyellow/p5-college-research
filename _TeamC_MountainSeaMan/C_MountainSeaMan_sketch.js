// this is a p5js v2 script

let alphaMaskImage = null;

async function setup() {
  _renderer = createCanvas(1080, 1920, WEBGL);

  // set to orthographic projection
  colorMode(HSB);
  rectMode(CENTER);
  imageMode(CENTER);

  // create buffers
  let colorLayerBuffer = createFramebuffer();
  let alphaMaskBuffer = createFramebuffer();

  // load alpha mask image
  alphaMaskImage = await loadImage('images/mask-letter-sea.png');

  // draw random collage on the color buffer
  // use color rects to demo for now
  colorLayerBuffer.begin();

  let mainHue = random(0, 360);

  for(let i=0; i< 2000; i++)
  {
    let posX = random(-width/2, width/2);
    let posY = random(-height/2, height/2);
    let size = random(50, 300);

    let nowHue = mainHue + random(-60, 60);
    let nowSat = random(40, 60);
    let nowBri = random(80, 100);

    noStroke();
    fill(nowHue, nowSat, nowBri, 80);
    rect(posX, posY, size, size);
  }

  colorLayerBuffer.end();


  // draw mask to alpha buffer
  alphaMaskBuffer.begin();

  let maskPosX = random(-width / 4, width / 4);
  let maskPosY = random(-height / 4, height / 4);
  let maskSize = random(480, 1600);

  background(0);
  image(alphaMaskImage, maskPosX, maskPosY, maskSize, maskSize);

  alphaMaskBuffer.end();

  // draw them on canvas with shader
  let alphaMaskShader = await loadShader("../shaders/image_alpha_mask.vert", "../shaders/image_alpha_mask.frag");
  let testBGImage = await loadImage('images/test-bg-wave.png');

  image(testBGImage, 0, 0, width, height);
  
  shader(alphaMaskShader);
  alphaMaskShader.setUniform("uMainTexture", colorLayerBuffer);
  alphaMaskShader.setUniform("uAlphaTexture", alphaMaskBuffer);

  noSmooth();
  fill(0, 0, 100); // white
  rectMode(CENTER);
  rect(0, 0, width, height);
  resetShader();

  // draw debug to show the two layers
  let debugSize = 0.25;
  image(colorLayerBuffer, -width/2 + (width * debugSize)/2, height/2 - (height * debugSize)/2, width * debugSize, height * debugSize);
  image(alphaMaskBuffer, width/2 - (width * debugSize)/2, height/2 - (height * debugSize)/2, width * debugSize, height * debugSize);
}

function draw() {
 
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
