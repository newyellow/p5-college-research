let uniformsShader;
let startTime;
let testTexture;



async function setup() {
  createCanvas(1080, 1920, WEBGL);

  testTexture = await loadImage("images/test-photo-1.jpg");
  testTexture01 = await loadImage("images/test-photo-5.jpg");
  testTexture02 = await loadImage("images/test-photo-6.jpg");
  uniformsShader = await loadShader(
    "shaders/uniform.vert",
    "shaders/effect_02.frag"
  );
  startTime = millis();
}

function draw() {
  shader(uniformsShader);

  uniformsShader.setUniform("width", 1080.0);
  uniformsShader.setUniform("height", 1920.0);
  uniformsShader.setUniform("time", (millis() - startTime) / 1000.0);
  uniformsShader.setUniform("uresolution", [width, height]);

  uniformsShader.setUniform("utexture", testTexture);
  uniformsShader.setUniform("utexture2", testTexture01);
  uniformsShader.setUniform("utexture3", testTexture02);

  noStroke();
  rect(0, 0, width, height);
}
