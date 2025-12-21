//可按R重新生成
let bgImage;
new p5((sketch) => {
  let startTime;

  let waveImages = []; // 海浪
  let maskImages = []; // 中心文字遮罩
  let centerFillImages = []; // 中心圖
  let mountainImages = []; // 山脈圖

  let alphaMaskShader;
  let centerColorBuffer;
  let centerMaskBuffer;
  let mountainBuffers = [];

  const config = {
    waves: {
      count: 0,
      heightRatio: 0,
      images: [],
    },
    center: {
      maskIndex: 0,
      imageIndex: 0,
      size: 1000,
      offsetX: 0,
      offsetY: 0,
    },
    mountains: {
      count: 0,
      layers: [],
    },
  };

  sketch.setup = async () => {
    bgImage = await sketch.loadImage(`images/bg.png`);

    alphaMaskShader = await sketch.loadShader(
      "../shaders/image_alpha_mask.vert",
      "../shaders/image_alpha_mask.frag"
    );
    let cnv = sketch.createCanvas(1080, 1920, sketch.WEBGL);
    cnv.style("position", "fixed");
    cnv.style("top", "50%");
    cnv.style("left", "50%");
    cnv.style("transform", "translate(-50%, -50%)");
    cnv.style("z-index", "3");

    sketch.pixelDensity(1);
    sketch.colorMode(sketch.HSB);

    waveImages[0] = await sketch.loadImage(`images/wave_00.png`);

    for (let i = 0; i < 3; i++) {
      maskImages[i] = await sketch.loadImage(
        `images/mask_${String(i).padStart(2, "0")}.png`
      );
    }

    for (let i = 0; i < 6; i++) {
      mountainImages[i] = await sketch.loadImage(
        `images/mountain_${String(i).padStart(2, "0")}.png`
      );
    }

    for (let i = 0; i < 3; i++) {
      centerFillImages[i] = await sketch.loadImage(
        `images/center_${String(i).padStart(2, "0")}.png`
      );
    }

    centerColorBuffer = sketch.createFramebuffer();
    centerMaskBuffer = sketch.createFramebuffer();

    mountainBuffers = [];

    initWaves();
    initCenter();
    initMountains();

    drawCenterBuffers();
    drawMountainBuffers();

    startTime = sketch.millis();
  };

  function initWaves() {
    config.waves.heightRatio = sketch.random(0.2, 0.25);
    const waveHeight = sketch.height * config.waves.heightRatio;
    config.waves.count = sketch.floor(sketch.random(3, 7));

    config.waves.images = [];
    for (let i = 0; i < config.waves.count; i++) {
      const waveWidth = sketch.width / config.waves.count;
      config.waves.images.push({
        x: -sketch.width / 2 + i * waveWidth,
        y: -sketch.height / 2,
        width: waveWidth * 1.1,
        height: waveHeight,
      });
    }
  }

  function initCenter() {
    config.center.maskIndex = sketch.floor(sketch.random(3));
    config.center.imageIndex = sketch.floor(sketch.random(3));
    config.center.offsetX = sketch.random(
      -sketch.width * 0.2,
      sketch.width * 0.2
    );
    config.center.offsetY = sketch.random(
      -sketch.height * 0.01,
      sketch.height * 0.01
    );
  }

  function initMountains() {
    config.mountains.count = sketch.floor(sketch.random(2, 4));
    config.mountains.layers = [];

    for (let i = 0; i < config.mountains.count; i++) {
      let peakCount =
        i === 0
          ? sketch.floor(sketch.random(2, 4))
          : sketch.floor(sketch.random(1, 3));
      let peaks = [];

      for (let p = 0; p < peakCount; p++) {
        let peakPosition = (p + 0.5) / peakCount;
        let peakHeight = sketch.map(
          i,
          0,
          config.mountains.count - 1,
          sketch.random(60, 120),
          sketch.random(300, 500)
        );
        peaks.push({
          x: peakPosition,
          height: peakHeight,
          leftSteepness: sketch.random(0.3, 1.5),
          rightSteepness: sketch.random(0.3, 1.5),
        });
      }

      let layerConfig;
      if (i === 0) {
        layerConfig = {
          peakYMin: sketch.height * 0.35,
          peakYMax: sketch.height * 0.45,
          baselineY: sketch.height / 2,
        };
      } else if (i === config.mountains.count - 1) {
        layerConfig = {
          peakYMin: sketch.height * 0.15,
          peakYMax: sketch.height * 0.25,
          baselineY: (sketch.height / 2) * 0.4,
        };
      } else {
        const t = i / (config.mountains.count - 1);
        layerConfig = {
          peakYMin: sketch.lerp(sketch.height * 0.35, sketch.height * 0.05, t),
          peakYMax: sketch.lerp(sketch.height * 0.45, sketch.height * 0.15, t),
          baselineY: sketch.lerp(
            sketch.height / 2,
            (sketch.height / 2) * 0.4,
            t
          ),
        };
      }

      config.mountains.layers.push({
        imageIndex: sketch.floor(sketch.random(6)),
        startXPercent: sketch.random(0, 0.1),
        endXPercent: sketch.random(0.9, 1.0),
        startY: sketch.random(layerConfig.peakYMin, layerConfig.peakYMax),
        endY: sketch.random(layerConfig.peakYMin, layerConfig.peakYMax),
        baselineY: layerConfig.baselineY,
        peaks: peaks,
        noiseOffset: sketch.random(1000)
      });
    }
  }

  function drawCenterBuffers() {
    centerColorBuffer.begin();
    sketch.clear();
    if (centerFillImages[config.center.imageIndex]) {
      sketch.imageMode(sketch.CENTER);
      sketch.image(
        centerFillImages[config.center.imageIndex],
        0,
        0,
        sketch.width,
        sketch.height
      );
    }
    centerColorBuffer.end();

    centerMaskBuffer.begin();
    sketch.background(0);
    if (maskImages[config.center.maskIndex]) {
      sketch.imageMode(sketch.CENTER);
      sketch.image(
        maskImages[config.center.maskIndex],
        config.center.offsetX,
        config.center.offsetY,
        config.center.size,
        config.center.size
      );
    }
    centerMaskBuffer.end();
  }

  function drawMountainBuffers() {
    mountainBuffers = [];

    for (let i = 0; i < config.mountains.layers.length; i++) {
      let layer = config.mountains.layers[i];

      let colorBuffer = sketch.createFramebuffer();
      colorBuffer.begin();
      sketch.clear();
      if (mountainImages[layer.imageIndex]) {
        sketch.imageMode(sketch.CENTER);
        sketch.image(
          mountainImages[layer.imageIndex],
          0,
          0,
          sketch.width,
          sketch.height
        );
      }
      colorBuffer.end();

      // 創建遮罩 buffer
      let maskBuffer = sketch.createFramebuffer();
      maskBuffer.begin();
      sketch.background(0);
      sketch.colorMode(sketch.RGB);
      sketch.noStroke(); // 確保沒有 stroke
      drawSingleMountainShape(layer, i);
      sketch.colorMode(sketch.HSB);
      maskBuffer.end();

      mountainBuffers.push({
        colorBuffer: colorBuffer,
        maskBuffer: maskBuffer,
      });
    }
  }

  function drawSingleMountainShape(layer, layerIndex) {
    sketch.push();
    sketch.noStroke();
    sketch.fill(255);

    const visibleStart = -sketch.width / 2 + layer.startXPercent * sketch.width;
    const visibleEnd = -sketch.width / 2 + layer.endXPercent * sketch.width;
    const totalWidth = visibleEnd - visibleStart;

    let controlPoints = [];
    controlPoints.push({ x: visibleStart - 200, y: layer.baselineY });
    controlPoints.push({ x: visibleStart, y: layer.startY });

    for (let p = 0; p < layer.peaks.length; p++) {
      let peak = layer.peaks[p];
      let peakX = visibleStart + totalWidth * peak.x;
      let peakY = sketch.lerp(layer.startY, layer.endY, peak.x) - peak.height;
      peakY = sketch.max(peakY, 0);

      if (p > 0) {
        let prevPeak = layer.peaks[p - 1];
        let steepnessRatio =
          prevPeak.rightSteepness /
          (prevPeak.rightSteepness + peak.leftSteepness);
        let valleyX =
          visibleStart +
          totalWidth * sketch.lerp(prevPeak.x, peak.x, steepnessRatio);
        let valleyDepthRatio = sketch.map(
          layerIndex,
          0,
          config.mountains.layers.length - 1,
          0.5,
          0.2
        );
        let valleyHeight =
          sketch.min(prevPeak.height, peak.height) * valleyDepthRatio;
        let valleyY =
          sketch.lerp(
            layer.startY,
            layer.endY,
            sketch.map(valleyX, visibleStart, visibleEnd, 0, 1)
          ) - valleyHeight;
        valleyY = sketch.max(valleyY, 0);
        controlPoints.push({ x: valleyX, y: valleyY });
      }
      controlPoints.push({ x: peakX, y: peakY });
    }

    controlPoints.push({ x: visibleEnd, y: layer.endY });
    controlPoints.push({ x: visibleEnd + 200, y: layer.baselineY });

    sketch.beginShape();
    sketch.vertex(controlPoints[0].x, layer.baselineY);

    const smoothSteps = 30;
    for (let j = 0; j < controlPoints.length - 1; j++) {
      let p0 = controlPoints[Math.max(0, j - 1)];
      let p1 = controlPoints[j];
      let p2 = controlPoints[j + 1];
      let p3 = controlPoints[Math.min(controlPoints.length - 1, j + 2)];

      for (let t = 0; t <= smoothSteps; t++) {
        let mu = t / smoothSteps;
        let mu2 = mu * mu;
        let mu3 = mu2 * mu;

        let x =
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * mu +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * mu2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * mu3);
        let y =
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * mu +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * mu2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * mu3);

        let noiseFactor = sketch.map(
          layerIndex,
          0,
          config.mountains.layers.length - 1,
          1.5,
          0.3
        );
        let noiseX1 = sketch.noise(x * 0.003 + layer.noiseOffset) - 0.5;
        let noiseX2 = sketch.noise(x * 0.01 + layer.noiseOffset + 50) - 0.5;
        let noiseY1 = sketch.noise(x * 0.003 + layer.noiseOffset + 100) - 0.5;
        let noiseY2 = sketch.noise(x * 0.01 + layer.noiseOffset + 150) - 0.5;

        x += (noiseX1 * 30 + noiseX2 * 15) * noiseFactor;
        y += (noiseY1 * 50 + noiseY2 * 25) * noiseFactor;
        sketch.vertex(x, y);
      }
    }

    sketch.vertex(controlPoints[controlPoints.length - 1].x, layer.baselineY);
    sketch.vertex(controlPoints[controlPoints.length - 1].x, sketch.height / 2);
    sketch.vertex(controlPoints[0].x, sketch.height / 2);
    sketch.endShape(sketch.CLOSE);
    sketch.pop();
  }

  sketch.draw = () => {
    sketch.clear();
    let currentTime = (sketch.millis() - startTime) / 1000.0;

    if (bgImage) {
      sketch.push();
      sketch.imageMode(sketch.CENTER);
      sketch.image(bgImage, 0, 0, sketch.width, sketch.height);
      sketch.pop();
    }
    drawWaves(currentTime);
    drawMountainsWithMask();
    drawCenterWithMask(currentTime);
  };

  function drawWaves(time) {
    sketch.push();
    for (let wave of config.waves.images) {
      if (waveImages[0]) {
        sketch.push();
        let waveOffset = sketch.sin(time * 0.5 + wave.x * 0.001) * 5;
        sketch.imageMode(sketch.CORNER);
        sketch.image(
          waveImages[0],
          wave.x,
          wave.y + waveOffset,
          wave.width,
          wave.height
        );
        sketch.pop();
      }
    }
    sketch.pop();
  }

  function drawMountainsWithMask() {
    sketch.push();

    for (let i = mountainBuffers.length - 1; i >= 0; i--) {
      let buffer = mountainBuffers[i];

      sketch.push();
      sketch.shader(alphaMaskShader);
      alphaMaskShader.setUniform("uMainTexture", buffer.colorBuffer);
      alphaMaskShader.setUniform("uAlphaTexture", buffer.maskBuffer);
      sketch.noStroke();
      sketch.rectMode(sketch.CENTER);
      sketch.rect(0, 0, sketch.width, sketch.height);
      sketch.resetShader();
      sketch.pop();
    }

    sketch.pop();
  }

  function drawCenterWithMask(time) {
    let floatY = sketch.sin(time * 0.8) * 15;
    sketch.push();
    sketch.translate(config.center.offsetX, config.center.offsetY + floatY);
    sketch.shader(alphaMaskShader);
    alphaMaskShader.setUniform("uMainTexture", centerColorBuffer);
    alphaMaskShader.setUniform("uAlphaTexture", centerMaskBuffer);
    sketch.noStroke();
    sketch.rectMode(sketch.CENTER);
    sketch.rect(0, 0, sketch.width, sketch.height);
    sketch.resetShader();
    sketch.pop();
  }

  sketch.keyPressed = () => {
    if (sketch.key === "r" || sketch.key === "R") {
      initWaves();
      initCenter();
      initMountains();
      drawCenterBuffers();
      drawMountainBuffers();
    }
  };
}, "layer-02-container");
