new p5((sketch) => {
  let startTime;
  let images = [];

  const layers = [
    {
      type: "image",
      imageIndex: 5,
      count: 8,
      radius: 900,
      size: 250,
      rotationSpeed: 0.1,
      selfRotation: 0.2,
    },
    {
      type: "image",
      imageIndex: 1,
      count: 8,
      radius: 700,
      size: 250,
      rotationSpeed: -0.15,
      selfRotation: 0,
      startAngle: Math.PI / 8,
    },
    {
      type: "image",
      imageIndex: 2,
      count: 16,
      radius: 530,
      size: 150,
      rotationSpeed: 0.2,
      selfRotation: -0.3,
    },
    {
      type: "image",
      imageIndex: 3,
      count: 12,
      radius: 400,
      size: 150,
      rotationSpeed: -0.12,
      selfRotation: 0.5,
      startAngle: Math.PI / 12,
    },
    {
      type: "image",
      imageIndex: 4,
      count: 12,
      radius: 250,
      size: 100,
      rotationSpeed: 0.18,
      selfRotation: -0.5,
      startAngle: Math.PI / 6,
    },
    {
      type: "image",
      imageIndex: 0,
      count: 12,
      radius: 125,
      size: 100,
      rotationSpeed: 0.18,
      selfRotation: -0.5,
      startAngle: Math.PI / 6,
    },
  ];

  sketch.setup = async () => {
    // N 張圖
    for (let i = 0; i < 6; i++) {
      let imgPath = `../images/group_04/${String(i).padStart(2, "0")}.png`;
      images[i] = await sketch.loadImage(imgPath);
    }
    console.log("✅ Images loaded:", images.length);

    let cnv = sketch.createCanvas(1080, 1920, sketch.WEBGL);
    cnv.style("position", "fixed");
    cnv.style("top", "50%");
    cnv.style("left", "50%");
    cnv.style("transform", "translate(-50%, -50%)");
    cnv.style("z-index", "2");

    sketch.pixelDensity(1);
    startTime = sketch.millis();
  };

  sketch.draw = () => {
    sketch.clear();

    let currentTime = (sketch.millis() - startTime) / 1000.0;

    sketch.fill(100, 150, 100, 150);
    sketch.noStroke();
    sketch.circle(0, 0, 30);

    for (let layer of layers) {
      drawDecorLayer(layer, currentTime);
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

      // sketch.push();
      // sketch.translate(x, y);
      // sketch.rotate(angle + time * layer.selfRotation);

      // sketch.fill(...layer.color);
      // sketch.noStroke();

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

        // case "ellipse":
        //   sketch.ellipse(0, 0, layer.size.w, layer.size.h);
        //   break;

        // case "semicircle":
        //   sketch.arc(0, 0, layer.size, layer.size, 0, sketch.PI);
        //   break;

        // case "sector":
        //   sketch.arc(
        //     0,
        //     0,
        //     layer.size,
        //     layer.size,
        //     -layer.sectorAngle / 2,
        //     layer.sectorAngle / 2,
        //     sketch.PIE
        //   );
        //   break;

        // case "rect":
        //   sketch.rectMode(sketch.CENTER);
        //   sketch.rect(0, 0, layer.size, layer.size);
        //   break;

        // case "triangle":
        //   sketch.triangle(
        //     -layer.size / 2,
        //     layer.size / 2,
        //     layer.size / 2,
        //     layer.size / 2,
        //     0,
        //     -layer.size / 2
        //   );
        //   break;
      }

      sketch.pop();
    }
  }
}, "decoration-container");
