

let imgNub = [];
new p5((sketch) => {
  let uniformsShader;
  let startTime;
  let testTexture, testTexture01, testTexture02;
  
  sketch.setup = async () => {
    let cnv = sketch.createCanvas(1080, 1920, sketch.WEBGL);
    cnv.style('position', 'fixed');
    cnv.style('top', '50%');
    cnv.style('left', '50%');
    cnv.style('transform', 'translate(-50%, -50%)');
    cnv.style('z-index', '1');
    
    sketch.pixelDensity(1);
    while (imgNub.length < 4) {
      let num = Math.floor(Math.random() * 13) + 1; // 1~13
      if (!imgNub.includes(num)) {
        imgNub.push(num);
      }
    } 

  let pad = (n) => n.toString().padStart(2, '0');

    texture = await sketch.loadImage(`images/layer00_${pad(imgNub[0])}.jpg`);
    texture01 = await sketch.loadImage(`images/layer00_${pad(imgNub[1])}.jpg`);
    texture02 = await sketch.loadImage(`images/layer00_${pad(imgNub[2])}.jpg`);
    texture03 = await sketch.loadImage(`images/layer00_${pad(imgNub[3])}.jpg`);
    // testTexture = await sketch.loadImage("images/test-photo-4.jpg");
    // testTexture01 = await sketch.loadImage("images/test-photo-1.jpg");
    // testTexture02 = await sketch.loadImage("images/test-photo-3.jpg");
      
    uniformsShader = await sketch.loadShader(
      "../shaders/uniform.vert",
      "../shaders/kaleidoscope.frag"
    );
    
    startTime = sketch.millis();
    
    console.log("✅ Kaleidoscope layer initialized");
  };
  
  sketch.draw = () => {
    let currentTime = (sketch.millis() - startTime) / 1000.0;
    
    sketch.shader(uniformsShader);
    
    uniformsShader.setUniform("width", 1080.0);
    uniformsShader.setUniform("height", 1920.0);
    uniformsShader.setUniform("time", currentTime);
    uniformsShader.setUniform("utexture", testTexture);
    uniformsShader.setUniform("utexture2", testTexture);
    uniformsShader.setUniform("utexture3", testTexture01);
    uniformsShader.setUniform("utexture4", testTexture02);
    
    sketch.noStroke();
    sketch.rect(0, 0, sketch.width, sketch.height);
  };
}, 'kaleidoscope-container');
