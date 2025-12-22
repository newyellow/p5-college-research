// get url parameters
const urlParams = new URLSearchParams(window.location.search);

const seed = urlParams.get('seed') || Math.random() * 100000000;
const p1 = parseFloat(urlParams.get('p1') || Math.random());
const p2 = parseFloat(urlParams.get('p2') || Math.random());
const p3 = parseFloat(urlParams.get('p3') || Math.random());
const subtype = parseInt(urlParams.get("subtype") || (Math.random() * 3));

// p5.js 2.0 script for Team D - Kaleidoscope
let _renderer = null;
let uniformsShader;
let startTime;

// Buffers
let bufferKaleidoscope;
let bufferDecoration;

// Kaleidoscope data
let texture0, texture1, texture2, texture3;
let lutTexture;
let textureAspects = [];
let imgNub = [];

// Decoration data
let decorImages = [];
let randomImage01, randomImage02;
let showRandom01 = false;
let showRandom02 = false;
let decorBuffer01, decorBuffer02;

let layers = [];

async function setup() {
  _renderer = createCanvas(1080, 1920, WEBGL);
  flex();
  pixelDensity(1);
  colorMode(RGB);

  seedPRNG(seed);

  // Generate random layers
  let layerCount = floor(random(6, 13));
  for (let i = 0; i < layerCount; i++) {
    let t = layerCount > 1 ? i / (layerCount - 1) : 0;
    layers.push({
      type: "image",
      count: floor(random(10, 20)),
      radius: lerp(900, 125, t),
      size: lerp(250, 100, t),
      rotationSpeed: random(-0.2, 0.2),
      selfRotation: random(-1, 1),
      startAngle: random(TWO_PI)
    });
  }

  // Initialize buffers
  bufferKaleidoscope = createFramebuffer();
  bufferDecoration = createFramebuffer();

  // --- Load Kaleidoscope Resources ---
  while (imgNub.length < 4) {
    let num = Math.floor(random() * 13) + 1; // 1~13
    if (!imgNub.includes(num)) {
      imgNub.push(num);
    }
  }

  let pad = (n) => n.toString().padStart(2, '0');
  texture0 = await loadImage(`images/layer00_${pad(imgNub[0])}.jpg`);
  texture1 = await loadImage(`images/layer00_${pad(imgNub[1])}.jpg`);
  texture2 = await loadImage(`images/layer00_${pad(imgNub[2])}.jpg`);
  texture3 = await loadImage(`images/layer00_${pad(imgNub[3])}.jpg`);

  let lutPath = getLUTPath(p1);
  lutTexture = await loadImage("../" + lutPath);

  textureAspects = [
    texture0.width / texture0.height,
    texture1.width / texture1.height,
    texture2.width / texture2.height,
    texture3.width / texture3.height
  ];

  uniformsShader = await loadShader(
    "../shaders/uniform.vert",
    "../shaders/team_D.frag"
  );

  // --- Load Decoration Resources ---
  for (let i = 0; i < 15; i++) {
    let imgPath = `images/${String(i).padStart(2, "0")}.png`;
    decorImages[i] = await loadImage(imgPath);
  }

  randomImage01 = await loadImage("images/random_01.jpg");
  randomImage02 = await loadImage("images/random_02.jpg");

  // Preselect images based on subtype
  let preselectedIndices = [];
  if (subtype === 0) {
    preselectedIndices = [5, 4, 8, 9];
  } else if (subtype === 1) {
    preselectedIndices = [1, 1, 6, 6];
  } else if (subtype === 2) {
    preselectedIndices = [0, 11, 12, 13];
  }

  // Fill remaining slots with random images
  while (preselectedIndices.length < layers.length) {
    preselectedIndices.push(floor(random() * decorImages.length));
  }

  // Shuffle and assign to layers
  preselectedIndices = shuffle(preselectedIndices);
  for (let i = 0; i < layers.length; i++) {
    layers[i].imageIndex = preselectedIndices[i];
  }

  showRandom01 = random() < 1 / 100;
  showRandom02 = random() < 1 / 1000;

  if (showRandom01) {
    decorBuffer01 = createMaskedFramebuffer(randomImage01, 300);
  }
  if (showRandom02) {
    decorBuffer02 = createMaskedFramebuffer(randomImage02, 300);
  }

  startTime = millis();
}

function draw() {
  let currentTime = (millis() - startTime) / 1000.0;

  // 1. Draw Kaleidoscope to its buffer
  bufferKaleidoscope.draw(() => {
    shader(uniformsShader);
    uniformsShader.setUniform("width", 1080.0);
    uniformsShader.setUniform("height", 1920.0);
    uniformsShader.setUniform("time", currentTime);
    uniformsShader.setUniform("utexture", texture0);
    uniformsShader.setUniform("utexture2", texture1);
    uniformsShader.setUniform("utexture3", texture2);
    uniformsShader.setUniform("utexture4", texture3);
    uniformsShader.setUniform("aspect1", textureAspects[0]);
    uniformsShader.setUniform("aspect2", textureAspects[1]);
    uniformsShader.setUniform("aspect3", textureAspects[2]);
    uniformsShader.setUniform("aspect4", textureAspects[3]);

    if (lutTexture) {
      uniformsShader.setUniform("uLutTexture", lutTexture);
      uniformsShader.setUniform("uLutIntensity", 1.0);
      uniformsShader.setUniform("uDoLut", 1);
    } else {
      uniformsShader.setUniform("uDoLut", 0);
    }

    noStroke();
    rect(0, 0, width, height);
  });

  // 2. Draw Decoration to its buffer
  bufferDecoration.draw(() => {
    clear();
    
    // Draw central mark
    fill(100, 150, 100, 150);
    noStroke();
    circle(0, 0, 30);

    for (let layer of layers) {
      drawDecorLayer(layer, currentTime);
    }

    if (showRandom01 && decorBuffer01) {
      push();
      texture(decorBuffer01);
      noStroke();
      plane(250, 250);
      pop();
    }

    if (showRandom02 && decorBuffer02) {
      push();
      texture(decorBuffer02);
      noStroke();
      plane(250, 250);
      pop();
    }
  });

  // 3. Composite both on main canvas
  background(0);
  imageMode(CENTER);
  image(bufferKaleidoscope, 0, 0);
  image(bufferDecoration, 0, 0);
}

function drawDecorLayer(layer, time) {
  for (let i = 0; i < layer.count; i++) {
    let angle =
      (TWO_PI / layer.count) * i +
      (layer.startAngle || 0) +
      time * layer.rotationSpeed;

    let x = cos(angle) * layer.radius;
    let y = sin(angle) * layer.radius;

    push();
    translate(x, y);
    rotate(angle + time * layer.selfRotation);

    switch (layer.type) {
      case "image":
        imageMode(CENTER);
        if (decorImages[layer.imageIndex]) {
          image(
            decorImages[layer.imageIndex],
            0,
            0,
            layer.size,
            layer.size
          );
        }
        break;
    }

    pop();
  }
}

/**
 * Creates a framebuffer containing the image masked by a circle.
 * Replaces the old createGraphics + pixel manipulation way.
 */
function createMaskedFramebuffer(img, size) {
  let fb = createFramebuffer({ width: size, height: size });
  
  fb.draw(() => {
    clear();
    push();
    
    // Use beginClip() for masking in p5.js 2.0 WEBGL
    beginClip();
    noStroke();
    circle(0, 0, size);
    endClip();
    
    imageMode(CENTER);
    image(img, 0, 0, size, size);
    
    pop();
  });
  
  return fb;
}
