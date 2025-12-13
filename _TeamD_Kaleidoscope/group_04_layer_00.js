

let imgNub = [];
new p5((sketch) => {
  let uniformsShader;
  let startTime;
  let texture, texture01, texture02, texture03;
  
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
      
    window.textureAspects = [
      texture.width / texture.height,
      texture01.width / texture01.height,
      texture02.width / texture02.height,
      texture03.width / texture03.height
    ];

    uniformsShader = await sketch.loadShader(
      "../shaders/uniform.vert",
      "../shaders/team_D.frag"
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
    uniformsShader.setUniform("utexture", texture);
    uniformsShader.setUniform("utexture2", texture01);
    uniformsShader.setUniform("utexture3", texture02);
    uniformsShader.setUniform("utexture4", texture03);
  uniformsShader.setUniform("aspect1", window.textureAspects[0]);
  uniformsShader.setUniform("aspect2", window.textureAspects[1]);
  uniformsShader.setUniform("aspect3", window.textureAspects[2]);
  uniformsShader.setUniform("aspect4", window.textureAspects[3]);
    
    sketch.noStroke();
    sketch.rect(0, 0, sketch.width, sketch.height);
  };
}, 'kaleidoscope-container');
