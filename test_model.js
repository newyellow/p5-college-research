
async function setup() {
    _renderer = createCanvas(1080, 1920, WEBGL);

    colorMode(HSB);
    rectMode(CENTER);
    imageMode(CENTER);
    background(0, 0, 20);

    // Initialize Collager
    let collager = new Collager();
    await collager.initSystem();

    // Add images
    await collager.addImage('images/test-photo-2.jpg', 0.1, 0.3);
    await collager.addImage('images/test-photo-5.jpg', 0.4, 0.6);
    await collager.addImage('images/test-photo-6.jpg', 0.7, 0.9);

    // outline settings
    collager.cutoutThickness(20);
    collager.cutoutNoiseScale(0.24);
    collager.cutoutRatio(0.0, 1.0);

    // collager.outlineWeight(1);
    collager.outlineWeight(0);
    collager.outlineRatio(0.1, 0.9);
    collager.outlineNoiseScale(6.0);

    // rect drawing settings
    collager.rectEdgeOffset(10);
    collager.rectRoundness(0);
    collager.rectNoiseScale(0.03);
    collager.rectPointCount(24);

    collager.shadow(10, 10, 30, [0, 0, 0], 0.3);
    collager.noShadow();

    // Enable debug mode
    collager.debug(true);
    collager.debugScale(0.25);

    // Draw Rects
    let flowFieldsCount = 1000;
    for (let i = 0; i < flowFieldsCount; i++) {
        let posX = random(-width / 2, width / 2);
        let posY = random(-height / 2, 0);

        let sizeW = random(20, 40);
        let sizeH = random(100, 200);

        let angleNoise = noise(posX * 0.001, posY * 0.0006, 666.0);
        let angleDegree = lerp(-360, 360, angleNoise);

        collager.drawRect(posX, posY, sizeW, sizeH, angleDegree);

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


    let mountainLayerCount = 12;
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
        await sleep(10);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
