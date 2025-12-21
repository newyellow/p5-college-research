function inverseLerp(_value, _min, _max) {
    return (_value - _min) / (_max - _min);
}

const NY_LUT_LIST = [
  "lut_textures/34-color-fx.png",
  "lut_textures/32-color-fx.png",
  "lut_textures/20-color-fx.png",
  "lut_textures/22-color-fx.png",
  "lut_textures/21-color-fx.png",
  "lut_textures/800T Indoor 04 S.png",
  "lut_textures/800T Indoor 01 S.png",
  "lut_textures/800T Indoor 03 S.png",
  "lut_textures/800T Indoor 04.png",
  "lut_textures/44-color-fx.png",
  "lut_textures/800T Indoor 01.png",
  "lut_textures/45-color-fx.png",
  "lut_textures/800T Indoor 03.png",
  "lut_textures/800T Indoor 02 S.png",
  "lut_textures/42-color-fx.png",
  "lut_textures/800T Indoor 05 S.png",
  "lut_textures/24-color-fx.png",
  "lut_textures/50-color-fx.png",
  "lut_textures/800T Day 02 S.png",
  "lut_textures/30-color-fx.png",
  "lut_textures/03-color-fx.png",
  "lut_textures/800T Day 02.png",
  "lut_textures/16-color-fx.png",
  "lut_textures/19-color-fx.png",
  "lut_textures/800T Indoor 02.png",
  "lut_textures/37-color-fx.png",
  "lut_textures/800T Indoor 05.png",
  "lut_textures/15-color-fx.png",
  "lut_textures/04-color-fx.png",
  "lut_textures/50D 02 S.png",
  "lut_textures/800T Day 03 S.png",
  "lut_textures/51-color-fx.png",
  "lut_textures/50D 02.png",
  "lut_textures/47-color-fx.png",
  "lut_textures/800T Day 03.png",
  "lut_textures/28-color-fx.png",
  "lut_textures/02-color-fx.png",
  "lut_textures/50D 05 S.png",
  "lut_textures/50D 05.png",
  "lut_textures/800T Day 01 S.png",
  "lut_textures/14-color-fx.png",
  "lut_textures/08-color-fx.png",
  "lut_textures/01-color-fx.png",
  "lut_textures/09-color-fx.png",
  "lut_textures/40-color-fx.png",
  "lut_textures/800T Day 01.png",
  "lut_textures/17-color-fx.png",
  "lut_textures/31-color-fx.png",
  "lut_textures/46-color-fx.png",
  "lut_textures/800T Day 04 S.png",
  "lut_textures/12-color-fx.png",
  "lut_textures/26-color-fx.png",
  "lut_textures/800T Day 05 S.png",
  "lut_textures/50D 01 S.png",
  "lut_textures/50D 03 S.png",
  "lut_textures/800T Day 04.png",
  "lut_textures/41-color-fx.png",
  "lut_textures/800T Night 02.png",
  "lut_textures/800T Night 02 S.png",
  "lut_textures/25-color-fx.png",
  "lut_textures/50D 04 S.png",
  "lut_textures/11-color-fx.png",
  "lut_textures/52-color-fx.png",
  "lut_textures/800T Day 05.png",
  "lut_textures/50D 01.png",
  "lut_textures/50D 03.png",
  "lut_textures/800T Night 01.png",
  "lut_textures/50D 04.png",
  "lut_textures/800T Night 04.png",
  "lut_textures/13-color-fx.png",
  "lut_textures/07-color-fx.png",
  "lut_textures/800T Night 01 S.png",
  "lut_textures/800T Night 04 S.png",
  "lut_textures/38-color-fx.png",
  "lut_textures/49-color-fx.png",
  "lut_textures/800T Night 03 S.png",
  "lut_textures/800T Night 03.png",
  "lut_textures/36-color-fx.png",
  "lut_textures/35-color-fx.png",
  "lut_textures/39-color-fx.png",
  "lut_textures/800T Night 05 S.png",
  "lut_textures/800T Night 05.png",
  "lut_textures/29-color-fx.png",
  "lut_textures/53-color-fx.png",
  "lut_textures/23-color-fx.png",
  "lut_textures/43-color-fx.png",
  "lut_textures/05-color-fx.png",
  "lut_textures/10-color-fx.png",
  "lut_textures/48-color-fx.png",
  "lut_textures/33-color-fx.png",
  "lut_textures/27-color-fx.png",
  "lut_textures/06-color-fx.png",
  "lut_textures/18-color-fx.png"
];

function getLUTPath(p1) {
    if (NY_LUT_LIST.length === 0) return null;
    let index = Math.floor(p1 * (NY_LUT_LIST.length - 1e-6));
    index = Math.max(0, Math.min(index, NY_LUT_LIST.length - 1));
    return NY_LUT_LIST[index];
}

function calculateUVInfosCoverMode(_drawWidth, _drawHeight, _imageWidth, _imageHeight, _drawScale) {

    let imageAspectRatio = _imageWidth / _imageHeight;
    let drawAspectRatio = _drawWidth / _drawHeight;

    // if draw target wider
    if(drawAspectRatio > imageAspectRatio) {

        let uvScaleX = 1.0 * _drawScale;
        let uvScaleY = uvScaleX / (drawAspectRatio / imageAspectRatio);
        
        let uvOffsetX = random(0.0, 1.0 - uvScaleX);
        let uvOffsetY = random(0.0, 1.0 - uvScaleY);

        return { uvScaleX, uvScaleY, uvOffsetX, uvOffsetY };
    }
    else
    {
        let uvScaleY = 1.0;
        let uvScaleX = uvScaleY * (drawAspectRatio / imageAspectRatio);

        let uvOffsetX = random(0.0, 1.0 - uvScaleX);
        let uvOffsetY = random(0.0, 1.0 - uvScaleY);

        return { uvScaleX, uvScaleY, uvOffsetX, uvOffsetY };
    }
}

function debugBufferLayers(debugItems, scale = 0.25) {
    if (!debugItems || debugItems.length === 0) return;
    
    // Save current state
    push();
    resetMatrix(); // Draw in screen space
  
    // In WebGL, 0,0 is center. Top left is -width/2, -height/2
    let startX = -width / 2;
    let startY = -height / 2;
  
    let drawW = width * scale;
    let drawH = height * scale;
  
    // Calculate how many debug views can fit per column
    let totalDebugViews = debugItems.length;
    let maxRowsPerColumn = max(1, floor(height / drawH));
    let columnsNeeded = ceil(totalDebugViews / maxRowsPerColumn);
  
    // Draw background for debug area to make it visible
    noStroke();
    fill(0, 0, 0, 0.5); // semi-transparent black
    rectMode(CORNER);
    rect(startX, startY, drawW * columnsNeeded, min(height, drawH * totalDebugViews));
  
    // Draw each debug view
    imageMode(CORNER);
    fill(255);
    textSize(16);
    for (let i = 0; i < debugItems.length; i++) {
      let col = floor(i / maxRowsPerColumn);
      let row = i % maxRowsPerColumn;
      
      let x = startX + col * drawW;
      let y = startY + row * drawH;
  
      // Draw the buffer
      if (debugItems[i]) {
        image(debugItems[i], x, y, drawW, drawH);
      }
  
      // // Draw the label
      // if (debugItems[i].label) {
      //   text(debugItems[i].label, x + 10, y + 10);
      // }
    }
  
    pop();
  }