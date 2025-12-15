function inverseLerp(_value, _min, _max) {
    return (_value - _min) / (_max - _min);
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