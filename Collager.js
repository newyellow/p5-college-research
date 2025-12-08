class Collager {
    constructor() {

        this.images = [];
        this.collageProfiles = [];

        // buffers
        this.shapeBufferSize = 1024;
        this._baseShapeBuffer = createFramebuffer();
        this._outlineGradientBuffer = createFramebuffer();
        this._finalShapeBuffer = createFramebuffer();
        this._baseShapeBuffer.resize(this.shapeBufferSize, this.shapeBufferSize);
        this._outlineGradientBuffer.resize(this.shapeBufferSize, this.shapeBufferSize);
        this._finalShapeBuffer.resize(this.shapeBufferSize, this.shapeBufferSize);

        this._resultBuffer = new FrameBufferSet();

        // shape stuff
        this.shapeModel = new NYModel('shape');
        this.outlineModel = null;

        // settings
        this._outlineThickness = 10;
        this._doOutline = true;
        this._outlineQualityLevel = 1;
        this._outlineNoiseScale = 1.2;

        // rect related settings
        this._rectNoiseScale = 0.01;
        this._rectEdgeOffset = 10;
        this._rectPointCount = 120;
        this._rectRoundness = 0;

        // debug features
        this._isDebug = false;
        this._debugScale = 0.2;
    }

    async initSystem() {
        this._outlineGradientShader = await loadShader('shaders/outline_gradient.vert', 'shaders/outline_gradient.frag');
        this._shapeMaskShader = await loadShader('shaders/shape_mask_outline.vert', 'shaders/shape_mask_outline.frag');
        this._fillShapeShader = await loadShader('shaders/fill_shape.vert', 'shaders/fill_shape.frag');

        this.outlineShaderProgram = await loadShader('shaders/outline.vert', 'shaders/outline.frag');
        this.maskShader = await loadShader('shaders/mask.vert', 'shaders/mask.frag');
        // this.blurShader = await loadShader('shaders/blur.vert', 'shaders/blur.frag');
        // this.thresholdShader = await loadShader('shaders/threshold.vert', 'shaders/threshold.frag');
        this.debugShader = await loadShader('shaders/debug.vert', 'shaders/debug.frag');

        this.shadowShader = await loadShader('shaders/shadow.vert', 'shaders/shadow.frag');
        this.lutShader = await loadShader('shaders/lut.vert', 'shaders/lut.frag');

        this.textureShader = await loadShader('shaders/texture.vert', 'shaders/texture.frag');

        this.noiseImageShape = await loadImage('textures/T_Noise_18.PNG');
        this.noiseImage = await loadImage('textures/TilingNoise05.PNG');

        this.lutTexture = await loadImage('lut_textures/800T Night 03.png');

        // this.noiseImage = await loadImage('textures/T_Noise_18.PNG');

        this.fontResource = await loadFont('fonts/Monospace.ttf');
    }

    async addImage(imageUrl, minRatio, maxRatio) {
        let newImg = await loadImage(imageUrl);
        this.images.push(newImg);
        this.collageProfiles.push(new CollageProfile(minRatio, maxRatio));
    }

    clearBuffers() {
        this.imgPieceBuffer.begin();
        clear();
        this.imgPieceBuffer.end();

        this.frameBufferA.begin();
        clear();
        this.frameBufferA.end();

        this.frameBufferB.begin();
        clear();
        this.frameBufferB.end();
    }

    clearImages() {
        this.images = [];
        this.collageProfiles = [];
    }

    drawVertexShape(_edgePointsArray) {

    }

    drawRect(_x, _y, _w, _h, _rotateDegree = 0) {
        // 1. Generate edge points with noise
        let points = NYModel.generatePointsForRoundedRect(_w, _h, this._rectRoundness, this._rectPointCount, this._rectNoiseScale, this._rectEdgeOffset);

        // 2. Build Shape Model
        this._setShapeByEdgePoints(points);

        // prepare the image and uv offset/scale
        let imageIndex = floor(random(0, this.images.length));

        let targetImg = this.images[imageIndex];
        let targetProfile = this.collageProfiles[imageIndex];

        let drawScale = random(targetProfile.minRatio, targetProfile.maxRatio);

        let uvInfos = calculateUVInfosCoverMode(_w, _h, targetImg.width, targetImg.height, drawScale);

        // 3. Draw to Buffer
        this._processTearingEffect(this.shapeModel, targetImg, [uvInfos.uvOffsetX, uvInfos.uvOffsetY], [uvInfos.uvScaleX, uvInfos.uvScaleY]);

        // 4. Draw to Screen
        push();
        translate(_x, _y); // Center of rect
        rotate(radians(_rotateDegree));

        // Draw the full buffer centered. 
        image(this._finalShapeBuffer, 0, 0, this.shapeBufferSize, this.shapeBufferSize);

        pop();

        if (this._isDebug) {
            this.drawDebug();
        }
    }

    _setShapeByEdgePoints(_edgePointsArray) {
        this.shapeModel.clear();
        this.shapeModel.addTrianglesByEdgePoints(_edgePointsArray);
        this.shapeModel.normalizeUV();
    }

    _processTearingEffect(_model, _imageData, _uvOffset = [0.0, 0.0], _uvScale = [1.0, 1.0]) {

        // generate outline model
        let outlineModel = this.shapeModel.generateOutlineModel(60, this._outlineThickness);
        let quadModel = NYModel.generateFullScreenQuadModel(this.shapeBufferSize, this.shapeBufferSize);

        // draw outline gradient for use
        this._outlineGradientBuffer.begin();
        clear();
        background(0, 0, 100);

        // fill inside
        shader(this._fillShapeShader);
        this._fillShapeShader.setUniform('uFillColor', [0.0, 0.0, 0.0, 1.0]);
        model(this.shapeModel.build());
        resetShader();

        shader(this._outlineGradientShader);
        model(outlineModel.build());

        resetShader();
        this._outlineGradientBuffer.end();


        // draw the basic image on the result buffer
        this._baseShapeBuffer.begin();
        clear();

        shader(this.textureShader);
        // shader(this.debugShader);
        this.textureShader.setUniform('uMainTexture', _imageData);
        this.textureShader.setUniform('uTextureOffset', _uvOffset);
        this.textureShader.setUniform('uTextureScale', _uvScale);

        model(this.shapeModel.build());

        resetShader();
        this._baseShapeBuffer.end();

        // final composite the shape
        this._finalShapeBuffer.begin();
        clear();

        shader(this._shapeMaskShader);
        this._shapeMaskShader.setUniform('uMainTexture', this._baseShapeBuffer);
        this._shapeMaskShader.setUniform('uGradientTexture', this._outlineGradientBuffer);

        this.setTextureWrap(this.noiseImage, REPEAT);
        this.setTextureWrap(this.noiseImage, REPEAT);
        this._shapeMaskShader.setUniform('uCutoutNoiseTexture', this.noiseImage);
        this._shapeMaskShader.setUniform('uOutlineNoiseTexture', this.noiseImage);

        this._shapeMaskShader.setUniform('uCutoutNoiseScale', [0.6, 0.6]);
        this._shapeMaskShader.setUniform('uOutlineNoiseScale', [0.4, 0.4]);

        this._shapeMaskShader.setUniform('uCutoutNoiseOffset', [random(-1000.0, 1000.0), random(-1000.0, 1000.0)]);
        this._shapeMaskShader.setUniform('uOutlineNoiseOffset', [random(-1000.0, 1000.0), random(-1000.0, 1000.0)]);

        this._shapeMaskShader.setUniform('uCutoutRatio', 0.2);
        this._shapeMaskShader.setUniform('uNoiseCutoutRatio', 0.8);

        this._shapeMaskShader.setUniform('uOutlineRatio', 0.1);
        this._shapeMaskShader.setUniform('uNoiseOutlineRatio', 0.8);

        this._shapeMaskShader.setUniform('uOutlineColor', [1.0, 1.0, 1.0]);
        this._shapeMaskShader.setUniform('uEdgeSharpness', 0.95);

        model(quadModel.build());
        resetShader();
        this._finalShapeBuffer.end();
    }

    maskedImagePass(_targetBuffer, _targetImgIndex, _tearThicknessRatio, _shapeNoiseScale, _detailTearRatio = 0.5, _useDetailNoise = true) {

        // padding is saved for outline; although usually don't need much
        let imgWidth = _targetBuffer.width;
        let imgHeight = _targetBuffer.height;

        let aspectRatio = imgWidth / imgHeight;

        //
        // TEXTURE SAMPLE SETTINGS
        //

        let targetImg = this.images[_targetImgIndex];
        let targetProfile = this.collageProfiles[_targetImgIndex];

        let targetDrawSizeRatio = random(targetProfile.minRatio, targetProfile.maxRatio);

        let targetUVWidth = aspectRatio * targetDrawSizeRatio;
        let targetUVHeight = 1.0 * targetDrawSizeRatio;

        let cropScaleX = targetUVWidth;
        let cropScaleY = targetUVHeight;

        let cropOffsetX = random(0.0, 1.0 - cropScaleX);
        let cropOffsetY = random(0.0, 1.0 - cropScaleY);

        //
        // NOISE MASK SETTINGS
        //

        // Base noise (Shape) settings
        let noiseOffsetX = random(-1.0, 1.0);
        let noiseOffsetY = random(-1.0, 1.0);
        // Adjust tiling to apply aspect ratio and prevent distortion
        let tilingX = _shapeNoiseScale * (aspectRatio > 1.0 ? aspectRatio : 1.0); // stretch X if wide
        let tilingY = _shapeNoiseScale * (aspectRatio < 1.0 ? 1.0 / aspectRatio : 1.0); // stretch Y if tall

        // Detail noise (Tear) settings
        let detailOffsetX = random(-1.0, 1.0);
        let detailOffsetY = random(-1.0, 1.0);

        // Scale tiling based on aspect ratio to prevent distortion
        let baseDetailScale = 0.2;

        // If width > height, we need more tiling on X to keep square noise pixels
        // If height > width, we need more tiling on Y
        let detailTilingX = baseDetailScale * (aspectRatio > 1.0 ? aspectRatio : 1.0);
        let detailTilingY = baseDetailScale * (aspectRatio < 1.0 ? 1.0 / aspectRatio : 1.0);

        _targetBuffer.begin();

        noStroke();

        shader(this.maskShader);
        this.setTextureWrap(targetImg, CLAMP);
        this.maskShader.setUniform('uMainTexture', targetImg);

        // Pass main texture transform
        this.maskShader.setUniform('uMainTextureOffset', [cropOffsetX, cropOffsetY]);
        this.maskShader.setUniform('uMainTextureScale', [cropScaleX, cropScaleY]); // Uniform scaling for now

        this.setTextureWrap(this.noiseImageShape, REPEAT);
        this.setTextureWrap(this.noiseImage, REPEAT);
        this.maskShader.setUniform('uNoiseTexture', this.noiseImageShape); // Shape noise
        this.maskShader.setUniform('uDetailNoiseTexture', this.noiseImage); // Detail noise
        this.maskShader.setUniform('uUseDetailNoise', _useDetailNoise ? 1.0 : 0.0); // Enable/Disable detail noise

        // Pass parameters to control tearing
        this.maskShader.setUniform('uTearRatio', _tearThicknessRatio);
        this.maskShader.setUniform('uDetailTearRatio', _detailTearRatio);

        // Pass random noise transform for Base
        this.maskShader.setUniform('uNoiseOffset', [noiseOffsetX, noiseOffsetY]);
        this.maskShader.setUniform('uNoiseScale', [tilingX, tilingY]);

        // Pass random noise transform for Detail
        this.maskShader.setUniform('uDetailNoiseOffset', [detailOffsetX, detailOffsetY]);
        this.maskShader.setUniform('uDetailNoiseScale', [detailTilingX, detailTilingY]);

        // Draw a full screen rect to apply the mask shader
        noStroke();
        fill(60, 60, 100);
        rect(0, 0, imgWidth, imgHeight);

        _targetBuffer.end();
    }

    shadowPass(_sourceBuffer, _targetBuffer, _offset = [10.0, 10.0], _radius = 20.0, _color = [0.0, 0.0, 0.0, 0.5]) {
        _targetBuffer.begin();
        clear();
        shader(this.shadowShader);
        this.shadowShader.setUniform('uMainTexture', _sourceBuffer);
        this.shadowShader.setUniform('uTextureSize', [_targetBuffer.width, _targetBuffer.height]);
        this.shadowShader.setUniform('uShadowOffset', _offset);
        this.shadowShader.setUniform('uBlurRadius', _radius);
        this.shadowShader.setUniform('uShadowColor', _color);
        this.shadowShader.setUniform('uShadowOpacity', _color[3]);
        this.shadowShader.setUniform('uBlurQuality', 2.0); // Medium quality
        noStroke();
        rect(0, 0, _targetBuffer.width, _targetBuffer.height);
        _targetBuffer.end();
    }

    lutPass(_sourceBuffer, _targetBuffer, _lutTexture, _intensity = 1.0) {
        _targetBuffer.begin();
        clear();
        shader(this.lutShader);
        this.lutShader.setUniform('uMainTexture', _sourceBuffer);
        this.lutShader.setUniform('uLutTexture', _lutTexture);
        this.lutShader.setUniform('uIntensity', _intensity);
        noStroke();
        rect(0, 0, _targetBuffer.width, _targetBuffer.height);
        _targetBuffer.end();
    }

    setTextureWrap(_texture, _wrapS = CLAMP, _wrapT = null) {
        if (_wrapT == null)
            _wrapT = _wrapS;

        let renderer = p5.instance._renderer;
        let p5Tex = renderer.getTexture(_texture);

        if (p5Tex) {
            p5Tex.setWrapMode(_wrapS, _wrapT);
        }
    }

    outlineWeight(_thickness) {
        this._outlineThickness = _thickness;
        this._doOutline = true;
    }

    outlineQuality(_qualityLevel) {
        this._outlineQualityLevel = _qualityLevel;
    }

    outlineNoiseScale(_scale) {
        this._outlineNoiseScale = _scale;
    }

    noOutline() {
        this._doOutline = false;
    }

    rectEdgeOffset(_offset) {
        this._rectEdgeOffset = _offset;
    }

    rectRoundness(_roundness) {
        this._rectRoundness = _roundness;
    }

    rectNoiseScale(_scale) {
        this._rectNoiseScale = _scale;
    }

    rectPointCount(_count) {
        this._rectPointCount = _count;
    }

    debug(_isDebug = true) {
        this._isDebug = _isDebug;
    }

    debugScale(_scale) {
        this._debugScale = _scale;
    }

    drawDebug() {
        if (!this._isDebug) return;

        // Save current state
        push();
        resetMatrix(); // Draw in screen space

        // In WebGL, 0,0 is center. Top left is -width/2, -height/2
        let startX = -width / 2;
        let startY = -height / 2;

        let drawW = this.shapeBufferSize * this._debugScale;
        let drawH = this.shapeBufferSize * this._debugScale;

        // Draw background for debug area to make it visible
        noStroke();
        fill(0, 0, 0, 0.5); // semi-transparent black
        rectMode(CORNER);
        rect(startX, startY, drawW, drawH * 3);

        // Draw _baseShapeBuffer
        imageMode(CORNER);
        // We need to flip Y because typically framebuffers are flipped? 
        // Or just standard image draw.
        // P5 images are usually fine.

        image(this._baseShapeBuffer, startX, startY, drawW, drawH);

        // Draw _outlineGradientBuffer
        image(this._outlineGradientBuffer, startX, startY + drawH, drawW, drawH);

        // Draw _finalShapeBuffer
        image(this._finalShapeBuffer, startX, startY + drawH * 2, drawW, drawH);

        // Add labels
        fill(255);
        textSize(16);
        textFont(this.fontResource);
        textAlign(LEFT, TOP);
        text("Base Shape", startX + 10, startY + 10);
        text("Outline Grad", startX + 10, startY + drawH + 10);
        text("Final Shape", startX + 10, startY + drawH * 2 + 10);

        pop();
    }

}

class CollageProfile {
    constructor(minRatio, maxRatio) {
        this.minRatio = minRatio;
        this.maxRatio = maxRatio;
    }
}