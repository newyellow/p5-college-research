
let curveReader;

async function setup() {

    createCanvas(1080, 1920);
    background(0);

    let curveData = await loadJSON("curve-data.json");
    console.log(curveData);

    curveReader = new CurveReader(curveData);
    console.log(curveReader);


    let sampleCount = 300;

    for (let i = 0; i <= sampleCount; i++) {
        let t = i / sampleCount;
        let pt = curveReader.evaluateCurve(t);

        stroke(255);
        strokeWeight(4);
        point(pt.x, pt.y);
    }
}