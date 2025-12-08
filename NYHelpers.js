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