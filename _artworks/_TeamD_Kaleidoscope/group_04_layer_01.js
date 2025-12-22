new p5((sketch) => {
  let startTime;
  let images = [];
  let randomImage01;
  let randomImage02;
  let showRandom01 = false;
  let showRandom02 = false;
  let tempGraphics01;
  let tempGraphics02;

  const layers = [
    {
      type: "image",
      count: 12,
      radius: 900,
      size: 250,
      rotationSpeed: 0.1,
      selfRotation: 0.2,
    },
    {
      type: "image",
      count: 12,
      radius: 700,
      size: 250,
      rotationSpeed: -0.2,
      selfRotation: 0,
      startAngle: Math.PI / 8,
    },
    {
      type: "image",
      count: 16,
      radius: 530,
      size: 200,
      rotationSpeed: 0.4,
      selfRotation: -0.3,
    },
    {
      type: "image",
      count: 12,
      radius: 400,
      size: 150,
      rotationSpeed: -0.12,
      selfRotation: -0.6,
      startAngle: Math.PI / 12,
    },
    {
      type: "image",
      count: 12,
      radius: 230,
      size: 150,
      rotationSpeed: 0.18,
      selfRotation: 0.8,
      startAngle: Math.PI / 6,
    },
    {
      type: "image",
      count: 12,
      radius: 125,
      size: 100,
      rotationSpeed: 0.18,
      selfRotation: -1,
      startAngle: Math.PI / 6,
    },
  ];

  sketch.setup = async () => {
    // N 張圖
    for (let i = 0; i < 15; i++) {
      let imgPath = `images/${String(i).padStart(2, "0")}.png`;
      images[i] = await sketch.loadImage(imgPath);
    }

    randomImage01 = await sketch.loadImage("images/random_01.jpg");
    randomImage02 = await sketch.loadImage("images/random_02.jpg");

    for (let layer of layers) {
      layer.imageIndex = Math.floor(Math.random() * images.length);
    }

    let cnv = sketch.createCanvas(1080, 1920, sketch.WEBGL);
    cnv.style("position", "fixed");
    cnv.style("top", "50%");
    cnv.style("left", "50%");
    cnv.style("transform", "translate(-50%, -50%)");
    cnv.style("z-index", "2");

    sketch.pixelDensity(1);

    showRandom01 = sketch.random() < 1 / 100;
    showRandom02 = sketch.random() < 1 / 1000;

    startTime = sketch.millis();
  };

  function createMaskedImage(img, size) {
    let tempG = sketch.createGraphics(size, size);

    tempG.imageMode(sketch.CENTER);
    tempG.image(img, size / 2, size / 2, size, size);

    let maskG = sketch.createGraphics(size, size);
    maskG.fill(255);
    maskG.noStroke();
    maskG.circle(size / 2, size / 2, size);

    tempG.loadPixels();
    maskG.loadPixels();

    for (let i = 0; i < tempG.pixels.length; i += 4) {
      tempG.pixels[i + 3] = maskG.pixels[i];
    }
    tempG.updatePixels();

    return tempG;
  }

  sketch.draw = () => {
    sketch.clear();

    tempGraphics01 = createMaskedImage(randomImage01, 300);
    tempGraphics02 = createMaskedImage(randomImage02, 300);
    let currentTime = (sketch.millis() - startTime) / 1000.0;

    sketch.fill(100, 150, 100, 150);
    sketch.noStroke();
    sketch.circle(0, 0, 30);

    for (let layer of layers) {
      drawDecorLayer(layer, currentTime);
    }

    if (showRandom01 && tempGraphics01) {
      sketch.push();
      sketch.texture(tempGraphics01);
      sketch.noStroke();
      sketch.plane(250, 250);
      sketch.pop();
    }

    if (showRandom02 && tempGraphics02) {
      sketch.push();
      sketch.texture(tempGraphics02);
      sketch.noStroke();
      sketch.plane(250, 250);
      sketch.pop();
    }
  };

  function drawDecorLayer(layer, time) {
    for (let i = 0; i < layer.count; i++) {
      let angle =
        (sketch.TWO_PI / layer.count) * i +
        (layer.startAngle || 0) +
        time * layer.rotationSpeed;

      let x = sketch.cos(angle) * layer.radius;
      let y = sketch.sin(angle) * layer.radius;

      sketch.push();
      sketch.translate(x, y);
      sketch.rotate(angle + time * layer.selfRotation);

      switch (layer.type) {
        case "image":
          sketch.imageMode(sketch.CENTER);
          if (images[layer.imageIndex]) {
            sketch.image(
              images[layer.imageIndex],
              0,
              0,
              layer.size,
              layer.size
            );
          }
          break;
      }

      sketch.pop();
    }
  }
}, "decoration-container");