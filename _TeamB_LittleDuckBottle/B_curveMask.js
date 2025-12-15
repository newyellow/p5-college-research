
let curveReaders = [];

async function loadBottleACurve() {
    let curveData = await loadJSON("curveData/bottle-A-curve.json");
    let bottleAReader = new CurveReader(curveData);
    curveReaders.push(bottleAReader);
}

async function loadBottleBCurve() {
    let curveData = await loadJSON("curveData/bottle-B-curve.json");
    let bottleBReader = new CurveReader(curveData);
    curveReaders.push(bottleBReader);
}

async function loadBottleCCurve() {
    let curveDataOut = await loadJSON("curveData/bottle-C-curve-out.json");
    let curveDataIn = await loadJSON("curveData/bottle-C-curve-in.json");

    let outReader = new CurveReader(curveDataOut);
    let inReader = new CurveReader(curveDataIn);

    curveReaders.push(outReader);
    curveReaders.push(inReader);
}

function drawCurveVertex(reader, sampleCount = 1000) {
    for (let i = 0; i <= sampleCount; i++) {
        let t = i / sampleCount;
        let pos = reader.evaluateCurve(t);

        let posX = -width / 2 + pos.x;
        let posY = -height / 2 + pos.y;

        vertex(posX, posY);
    }
}

function maskBottleBG() {
    beginClip();

    noStroke();
    fill(0, 0, 100);

    // out rect
    beginShape();
    {
        vertex(-width / 2 - 100, -height / 2 - 100);
        vertex(width / 2 + 100, -height / 2 - 100);
        vertex(width / 2 + 100, height / 2 + 100);
        vertex(-width / 2 - 100, height / 2 + 100);

        beginContour();
        {
            drawCurveVertex(curveReaders[0]);
        }
        endContour();
    }
    endShape(CLOSE);

    endClip();
}

function maskBottleBody() {
    beginClip();

    noStroke();
    fill(0, 0, 100);

    beginShape();
    {
        drawCurveVertex(curveReaders[0]);
    }
    endShape(CLOSE);

    endClip();
}

function maskBottleHole() {
    beginClip();

    noStroke();
    fill(0, 0, 100);

    beginShape();
    {
        drawCurveVertex(curveReaders[1]);
    }
    endShape(CLOSE);

    endClip();
}

// drawCurveStroke
function drawCurveStroke(_thickness = 5, _noiseThickness = 10, _noiseScale = 0.01, _sampleCount = 2000) {
    drawTargetCurveStroke(curveReaders[0], _thickness, _noiseThickness, _noiseScale, _sampleCount);
}

function drawTargetCurveStroke(_targetCurveReader, _thickness = 5, _noiseThickness = 10, _noiseScale = 0.01, _sampleCount = 2000) {
    let _reader = _targetCurveReader;

    // Step 1: Collect all curve points
    let curvePoints = [];
    for (let i = 0; i < _sampleCount; i++) {
        let t = i / _sampleCount;
        let pos = _reader.evaluateCurve(t);
        let posX = -width / 2 + pos.x;
        let posY = -height / 2 + pos.y;
        curvePoints.push(createVector(posX, posY));
    }

    // Step 2: Calculate normals for each point
    let normals = [];
    for (let i = 0; i < curvePoints.length; i++) {
        let current = curvePoints[i];
        let prev = curvePoints[(i - 1 + curvePoints.length) % curvePoints.length];
        let next = curvePoints[(i + 1) % curvePoints.length];

        // Tangent is from prev to next
        let tangent = p5.Vector.sub(next, prev);
        tangent.normalize();

        // Normal is perpendicular to tangent (rotate 90 degrees)
        let normal = createVector(-tangent.y, tangent.x);
        normals.push(normal);
    }

    // Step 3: Create outer and inner paths by pushing vertices along normals
    let outerPath = [];
    let innerPath = [];
    for (let i = 0; i < curvePoints.length; i++) {
        let point = curvePoints[i];
        let normal = normals[i];

        // Calculate noise-based thickness variation
        // Sample noise in a circular pattern for seamless looping
        let angle = (i / _sampleCount) * TWO_PI;
        let noiseRadius = 100; // Radius of the circular sampling path
        let nx = cos(angle) * noiseRadius;
        let ny = sin(angle) * noiseRadius;
        let noiseValue = noise(nx * _noiseScale, ny * _noiseScale);
        let noiseThickness = _noiseThickness * noiseValue;
        let totalThickness = _thickness + noiseThickness;

        // Push outward by total thickness
        let outer = p5.Vector.add(point, p5.Vector.mult(normal, totalThickness));
        outerPath.push(outer);

        // Push inward by total thickness
        let inner = p5.Vector.sub(point, p5.Vector.mult(normal, totalThickness));
        innerPath.push(inner);
    }

    // Step 4: Draw shape with outer contour and inner hole
    beginShape();
    {
        // Draw outer path
        for (let i = 0; i < outerPath.length; i++) {
            let p = outerPath[i];
            vertex(p.x, p.y);
        }

        // Draw inner contour (hole) - reversed to create proper winding
        beginContour();
        {
            for (let i = innerPath.length - 1; i >= 0; i--) {
                let p = innerPath[i];
                vertex(p.x, p.y);
            }
        }
        endContour();
    }
    endShape(CLOSE);
}