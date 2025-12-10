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

// subdivision rect settings
let mainHue = 0;
let maxDepth = 4;
let minDepth = 2;
let splitChance = 0.9;
let rectList = [];

// image settings
let windowImageList = [];
let windowProfiles = [];


async function setup() {
  _renderer = createCanvas(1080, 1920, WEBGL);
  flex();
  fontResource = await loadFont('../fonts/Monospace.ttf');

  randomSeed(seed);
  noiseSeed(seed);

  await loadWindowImages(0);

  mainHue = lerp(0, 360, p1);
  
  // Use p2 to control max depth (complexity)
  maxDepth = floor(lerp(2, 8, p2));
  
  // Use p4 to control split irregularity (split ratio range)
  // If p4 is 0, split near 0.5. If p4 is 1, split can be 0.1-0.9
  let variation = lerp(0.06, 0.36, p4); 
  let splitMin = 0.5 - variation;
  let splitMax = 0.5 + variation;
  
  minDepth = 2;
  
  // p3 controls padding?
  let rectPadding = lerp(10, 30, p3);

  // set to orthographic projection
  colorMode(HSB);
  rectMode(CENTER);
  imageMode(CENTER);

  background(0, 0, 30);
  
  // Create Subdivision
  // Start with a rectangle that fills the canvas (or slightly smaller with margin)
  let margin = 50;
  let w = width - margin * 2;
  let h = height - margin * 2;
  // Since we use WEBGL and CENTER mode, center is 0,0.
  // Top-left corner is -w/2, -h/2
  
  let subdivider = new SubdivisionRect(-w/2, -h/2, w, h, {
    minDepth: minDepth,
    maxDepth: maxDepth,
    splitRatioMin: splitMin,
    splitRatioMax: splitMax,
    splitChance: 0.85,
    padding: rectPadding,
    minSize: 100 // Stop splitting if smaller than this
  });
  
  rectList = subdivider.getLeaves();
  
  console.log("Generated rects:", rectList.length);
  AsyncDrawOnce();
}

function draw() {
  // Empty draw loop as we use AsyncDrawOnce for one-time drawing
}

async function AsyncDrawOnce() {
  background(0, 0, 30);
  
  noFill();
  stroke(mainHue, 80, 100);
  strokeWeight(2);
  
  // Draw all rectangles
  for (let r of rectList) {
    rectMode(CENTER);
    
    // Draw using new class methods
    
    // Find best image
    let rectAspectRatio = r.w / r.h; // Note: w and h are full size, aspect ratio is same regardless of padding usually, but image draw will respect padding
    
    if (windowImageList.length > 0) {
       let bestImg = getClosestWindowImage(rectAspectRatio);
       r.drawImage(bestImg);
    } else {
       // Fallback
       r.drawOutline();
    }
  }
}

function getClosestWindowImage(_rectAspectRatio)
{
  if (windowImageList.length === 0) return null;

  // 1. Calculate diffs for all images
  let candidates = windowImageList.map(img => {
    return {
      img: img,
      diff: Math.abs((img.width / img.height) - _rectAspectRatio)
    };
  });

  // 2. Sort by difference
  candidates.sort((a, b) => a.diff - b.diff);

  // 3. Find the minimum difference
  let minDiff = candidates[0].diff;

  // 4. Collect all candidates that are "close enough" to the best match
  // e.g., within a small threshold of the minDiff (like 10% relative difference or absolute small value)
  // Or simply, take the top N candidates if they are very close.
  // Let's use a tolerance: if diff is within minDiff + tolerance, consider it.
  
  let tolerance = 0.1; // 10% aspect ratio tolerance
  // If minDiff is very small, we might want a minimum floor for tolerance
  let effectiveTolerance = Math.max(minDiff * 1.1, minDiff + tolerance);

  let bestCandidates = candidates.filter(c => c.diff <= effectiveTolerance);

  // 5. Randomly pick one from the best candidates
  let selected = random(bestCandidates);
  
  return selected.img;
}

async function loadWindowImages(_windowSetIndex)
{
  if(_windowSetIndex == 0)
  {
    windowImageList.push(await loadImage('images/window-A-1-1.png'));
    windowImageList.push(await loadImage('images/window-A-1-2-1.png'));
    windowImageList.push(await loadImage('images/window-A-1-2-2.png'));
    windowImageList.push(await loadImage('images/window-A-1-3-1.png'));
    windowImageList.push(await loadImage('images/window-A-1-3-2.png'));
    windowImageList.push(await loadImage('images/window-A-2-1-2.png'));
    windowImageList.push(await loadImage('images/window-A-2-1.png'));
    windowImageList.push(await loadImage('images/window-A-3-1-1.png'));
    windowImageList.push(await loadImage('images/window-A-3-1-2.png'));
    windowImageList.push(await loadImage('images/window-A-3-1-3.png'));
  }
  else if(_windowSetIndex == 1)
  {
    windowImageList.push(await loadImage('images/window-B-1-1.png'));
    windowImageList.push(await loadImage('images/window-B-1-2-1.png'));
    windowImageList.push(await loadImage('images/window-B-1-2-2.png'));
    windowImageList.push(await loadImage('images/window-B-1-2-3.png'));
    windowImageList.push(await loadImage('images/window-B-2-1-1.png'));
    windowImageList.push(await loadImage('images/window-B-2-1-2.png'));
  }
  else if(_windowSetIndex == 2)
  {
    windowImageList.push(await loadImage('images/window-C-1.png'));
    windowImageList.push(await loadImage('images/window-C-2.png'));
    windowImageList.push(await loadImage('images/window-C-3.png'));
  }

  // produce window profiles
  for(let i=0; i<windowImageList.length; i++)
  {
    let img = windowImageList[i];
    let profile = {
      width: img.width,
      height: img.height,
      aspectRatio: img.width / img.height
    };
    windowProfiles.push(profile);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
