
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
    collager.outlineWeight(30);
    collager.outlineNoiseScale(2.0);

    // rect drawing settings
    collager.rectEdgeOffset(60);
    collager.rectRoundness(10);
    collager.rectNoiseScale(0.001);
    collager.rectPointCount(20);
    
    // Enable debug mode
    collager.debug(true);
    collager.debugScale(0.25);

    // Draw Rects
    let rectCount = 20;
    for(let i=0; i<rectCount; i++) {
        let x = random(-400, 400);
        let y = random(-800, 800);
        let w = random(100, 200);
        let h = random(400, 600);

        let r = random(-10, 10);
        
        collager.drawRect(x, y, w, h, r);
        
        await sleep(1);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
