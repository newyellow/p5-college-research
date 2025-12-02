let uniformsShader;
let startTime;
let testTexture;

async function setup() {
  createCanvas(1080, 1920, WEBGL);

  testTexture = await loadImage("images/test-shader-1.jpg");
  uniformsShader = await loadShader(
    "shaders/uniform.vert",
    "shaders/uniform.frag"
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

  noStroke();
  rect(0, 0, width, height);
}
