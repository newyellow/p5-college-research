
async function setup() {
    _renderer = createCanvas(1080, 1920, WEBGL);

    // set to orthographic projection
    colorMode(HSB);
    rectMode(CENTER);
    imageMode(CENTER);

    let debugShader = await loadShader('shaders/debug.vert', 'shaders/debug.frag');
    let testTexture = await loadImage('images/test-photo-3.jpg');

    let monoFont = await loadFont('fonts/Monospace.ttf');

    
    // test model A
    let testModelA = new NYModel('test-A');

    let pointsA = [];
    pointsA.push(new NYPoint(-240, 0));
    pointsA.push(new NYPoint(-180, -100));
    pointsA.push(new NYPoint(-80, -150));
    pointsA.push(new NYPoint(0, -30));
    pointsA.push(new NYPoint(-100, 20));
    pointsA.push(new NYPoint(-10, 60));
    pointsA.push(new NYPoint(120, 100));
    pointsA.push(new NYPoint(160, 0));
    pointsA.push(new NYPoint(80, -80));
    pointsA.push(new NYPoint(160, -200));
    pointsA.push(new NYPoint(250, 0));
    pointsA.push(new NYPoint(200, 200));
    pointsA.push(new NYPoint(20, 200));
    pointsA.push(new NYPoint(-120, 240));

    testModelA.addTrianglesByEdgePoints(pointsA);
    testModelA.normalizeUV();

    let outlineModelA = testModelA.generateOutlineModel(60, 60);

    fill(0, 0, 100);
    stroke(0, 100, 100);
    strokeWeight(20);

    shader(debugShader);
    debugShader.setUniform('uTexture', testTexture);
    debugShader.setUniform('uUseTexture', false);

    // model(nyModel.build());
    // model(outlineModelA.build());

    // draw points
    for (let i = 0; i < pointsA.length; i++) {
        fill(0, 100, 100);
        let p = pointsA[i];
        circle(p.x, p.y, 3);
        
        // Draw the number beside the point
        push();
        noStroke();
        fill(0, 0, 100);
        textSize(30);
        textFont(monoFont);
        textAlign(LEFT, CENTER);
        text(i, p.x + 8, p.y); // number beside point
        pop();
    }
    resetShader();


    // test collager
    let collager = new Collager();
    await collager.initShaders();

    await collager.addImage('images/test-photo-1.jpg', 0.1, 0.3);
    await collager.addImage('images/test-photo-2.jpg', 0.4, 0.6);
    await collager.addImage('images/test-photo-3.jpg', 0.7, 0.9);

    collager.setShapeByEdgePoints(pointsA);
    collager.drawShape();

    // image(collager._baseShapeBuffer, 0, 0);
    // image(collager._outlineGradientBuffer, 0, 0);
    image(collager._finalShapeBuffer, 0, 0);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
