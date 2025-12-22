// get url parameters
const urlParams = new URLSearchParams(window.location.search);

const seed = urlParams.get('seed') || Math.random() * 100000000;
const p1 = parseFloat(urlParams.get('p1') || Math.random());
const p2 = parseFloat(urlParams.get('p2') || Math.random());
const p3 = parseFloat(urlParams.get('p3') || Math.random());

// Parameter multipliers (0.7 is the reference "current" level)
const p2AmountMult = p2 / 0.7;
const p3ChaosMult = p3 / 0.7;

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

const density = urlParams.get('density') || 1;

async function setup() {
  _renderer = createCanvas(1080, 1920, WEBGL);
  pixelDensity(parseFloat(density));
  flex();
  colorMode(RGB);

  seedPRNG(seed);

  // Generate random layers
  // p2 logic: 0.7 is current level. If p2=0, at least 3 layers and 5 objects.
  let p2Target = p2 / 0.7;
  
  // p3 logic: 0.7 is current level (1.0x). If p3=1, 1.6x faster. If p3=0, moves a little bit (0.15x).
  let p3Target = p3 <= 0.7 
    ? lerp(0.15, 1.0, p3 / 0.7) 
    : lerp(1.0, 1.6, (p3 - 0.7) / 0.3);

  let p2SizeMult = lerp(1.7, 1.0, p2Target);

  let layerCount = floor(lerp(3, random(10, 15), p2Target));

  for (let i = 0; i < layerCount; i++) {
    let t = layerCount > 1 ? i / (layerCount - 1) : 0;
    
    let objCount = floor(lerp(5, random(12, 18), p2Target));
    
    let rotSpeedBase = random(-0.02, 0.02);
    let rotSpeedVar = random(-0.18, 0.36) * p3Target;
    
    let selfRotBase = random(-0.1, 0.1);
    let selfRotVar = random(-0.9, 0.9) * p3Target;

    let waveAmpBase = random(2, 5);
    let waveAmpVar = random(10, 60) * p3Target;
    
    // Size pulsation amplitude
    let sizeAmp = random(0.05, 0.25) * p3Target;

    layers.push({
      type: "image",
      count: objCount,
      radius: lerp(900, 125, t),
      size: lerp(250, 100, t) * p2SizeMult,
      rotationSpeed: rotSpeedBase + rotSpeedVar,
      selfRotation: selfRotBase + selfRotVar,
      waveAmplitude: waveAmpBase + waveAmpVar,
      waveSpeed: random(0.5, 2.0) * p3Target,
      wavePhase: random(TWO_PI),
      sizeAmplitude: sizeAmp,
      sizeSpeed: random(1.0, 3.0),
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
  if (layer.count <= 0) return;

  for (let i = 0; i < layer.count; i++) {
    let angle =
      (TWO_PI / layer.count) * i +
      (layer.startAngle || 0) +
      time * layer.rotationSpeed;

    // Apply waving effect to radius based on p3
    let currentRadius = layer.radius + sin(time * (layer.waveSpeed || 0) + (layer.wavePhase || 0)) * (layer.waveAmplitude || 0);

    // Apply size pulsation based on p3
    let currentSize = layer.size * (1.0 + sin(time * (layer.sizeSpeed || 1.0) + (layer.wavePhase || 0)) * (layer.sizeAmplitude || 0));

    let x = cos(angle) * currentRadius;
    let y = sin(angle) * currentRadius;

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
            currentSize,
            currentSize
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
