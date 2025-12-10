

let bufferLayerColorful;
let bufferLayerMask;

async function setup() {
    _renderer = createCanvas(1080, 1920, WEBGL);

    colorMode(HSB);
    rectMode(CENTER);
    imageMode(CENTER);
    background(0, 0, 20);

    // init buffers
    bufferLayerColorful = createFramebuffer();
    bufferLayerMask = createFramebuffer();

    // Initialize Collager
    let collager = new Collager();
    await collager.initSystem();

    // Add images
    await collager.addImage('images/test-photo-2.jpg', 0.1, 0.3);
    await collager.addImage('images/test-photo-5.jpg', 0.2, 0.4);
    await collager.addImage('images/test-photo-6.jpg', 0.3, 0.6);

    // outline settings
    collager.cutoutThickness(30);
    collager.cutoutNoiseScale(0.24);
    collager.cutoutRatio(0.2, 0.8);

    // collager.outlineWeight(1);
    collager.outlineWeight(16);
    collager.outlineRatio(0.1, 0.9);
    collager.outlineNoiseScale(0.8);

    // rect drawing settings
    collager.rectEdgeOffset(20);
    collager.rectRoundness(3);
    collager.rectNoiseScale(0.006);
    collager.rectPointCount(30);

    collager.shadow(10, 10, 30, [0, 0, 0], 0.3);

    // Enable debug mode
    collager.debug(true);
    collager.debugScale(0.2);


    // Draw Rects
    let flowFieldsCount = 1000;
    for (let i = 0; i < flowFieldsCount; i++) {
        let posX = random(-width / 2, width / 2);
        let posY = random(-height / 2, 0);

        let sizeW = random(30, 40);
        let sizeH = random(100, 200);

        let angleNoise = noise(posX * 0.0006, posY * 0.00036, 666.0);
        let angleDegree = lerp(-360, 360, angleNoise);

        collager.drawRect(posX, posY, sizeW, sizeH, angleDegree);

        // draw on colorful
        bufferLayerColorful.draw(() => {
            collager.redrawRect(posX, posY, sizeW, sizeH, angleDegree);
        });

        // draw on mask
        let maskColorRandom = random(0, 1);
        if (maskColorRandom < 0.2) {
            bufferLayerMask.draw(() => {
                tint(0, 0, 100);
                collager.redrawRectMask(posX, posY, sizeW, sizeH, angleDegree);
            });
        }
        else {
            bufferLayerMask.draw(() => {
                tint(0, 0, 0);
                collager.redrawRectMask(posX, posY, sizeW, sizeH, angleDegree);
            });
        }

        if (i % 10 == 0) {
            await sleep(1);
        }
    }


    // draw mountains
    collager.cutoutThickness(200);
    collager.cutoutNoiseScale(0.6);
    collager.cutoutRatio(0.2, 0.8);

    collager.outlineWeight(100);
    collager.outlineNoiseScale(0.018);
    collager.outlineRatio(0.3, 0.7);


    let mountainLayerCount = 22;
    let xSamplePoints = 10;

    let mountainHeightRange = [60, 666];
    let mountainHeightNoiseScaleX = 0.002;
    let mountainHeightNoiseScaleY = 0.036;

    let mountainLayerOffset = 80;

    let yStart = 0;

    for (let y = 0; y < mountainLayerCount; y++) {
        yStart += mountainLayerOffset * random(0.2, 1.0);

        let mountainUpperPoints = [];
        let mountainLowerPoints = [];

        let xStart = -0.6 * width;
        let xEnd = 0.6 * width;

        let xStep = width / xSamplePoints;

        for (let x = 0; x < xSamplePoints; x++) {
            let xt = x / (xSamplePoints - 1);

            let xPos = lerp(xStart, xEnd, xt) + random(-0.1, 0.1) * xStep;
            let yPos = yStart;

            let heightNoiseValue = noise(xPos * mountainHeightNoiseScaleX, yPos * mountainHeightNoiseScaleY, 1234);
            let mountainAddHeight = lerp(mountainHeightRange[0], mountainHeightRange[1], heightNoiseValue);

            let botXPos = lerp(xStart, xEnd, xt) + random(-0.1, 0.1) * xStep;
            let botYPos = yStart;

            let botNoiseValue = noise(botXPos * mountainHeightNoiseScaleX, botYPos * mountainHeightNoiseScaleY, 1234);
            let botAddHeight = lerp(mountainHeightRange[0] * 0.2, mountainHeightRange[1] * 0.2, botNoiseValue);

            yPos -= mountainAddHeight;
            botYPos += botAddHeight;

            mountainUpperPoints.push(new NYPoint(xPos, yPos));
            mountainLowerPoints.push(new NYPoint(botXPos, botYPos));
        }

        // build clockwise array
        let mountainPoints = [];
        mountainPoints.push(...mountainUpperPoints);
        mountainPoints.push(...mountainLowerPoints.reverse());

        collager.drawVertexShape(mountainPoints);

        // draw on colorful
        bufferLayerColorful.draw(() => {
            collager.redrawVertexShape();
        });

        // draw on mask
        let maskColorRandom = random(0, 1);
        if (maskColorRandom < 0.3) {
            bufferLayerMask.draw(() => {
                tint(0, 0, 100);
                collager.redrawVertexShapeMask();
            });
        }
        else {
            bufferLayerMask.draw(() => {
                tint(0, 0, 0);
                collager.redrawVertexShapeMask();
            });
        }
        await sleep(10);
    }

    // check layer buffers, draw them on right with size 0.4
    // image(bufferLayerColorful, 0, 0, width * 0.4, height * 0.4);
    // image(bufferLayerMask, width * 0.4, 0, width * 0.4, height * 0.4);

    // breathing shader
    let uniformsShader = await loadShader(
        "shaders/uniform.vert",
        "shaders/effect_02.frag"
    );
    startTime = millis();

    // loop draw
    while (true) {
        shader(uniformsShader);

        uniformsShader.setUniform("width", 1080.0);
        uniformsShader.setUniform("height", 1920.0);
        uniformsShader.setUniform("time", (millis() - startTime) / 1000.0);
        uniformsShader.setUniform("uresolution", [width, height]);

        uniformsShader.setUniform("utexture", bufferLayerColorful);
        uniformsShader.setUniform("uMaskTexture", bufferLayerMask);

        noStroke();
        rect(0, 0, width, height);

        await sleep(16);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
