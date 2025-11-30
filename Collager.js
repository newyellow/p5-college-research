class Collager {
    constructor() {

        this.images = [];
        this.collageProfiles = [];

        this.imgPieceBuffer = createFramebuffer();

        // input output fbo
        this.swapState = true;
        this.frameBufferA = createFramebuffer();
        this.frameBufferB = createFramebuffer();

        this.sourceBuffer = this.frameBufferA;
        this.targetBuffer = this.frameBufferB;


        // settings
        this._outlineThickness = 10;
        this._doOutline = true;
        this._outlineQualityLevel = 1;
        this._outlineNoiseScale = 1.2;
    }

    async initShaders() {
        this.outlineShaderProgram = await loadShader('shaders/outline.vert', 'shaders/outline.frag');
        this.maskShader = await loadShader('shaders/mask.vert', 'shaders/mask.frag');
        this.blurShader = await loadShader('shaders/blur.vert', 'shaders/blur.frag');
        this.thresholdShader = await loadShader('shaders/threshold.vert', 'shaders/threshold.frag');
        this.shadowShader = await loadShader('shaders/shadow.vert', 'shaders/shadow.frag');
        this.lutShader = await loadShader('shaders/lut.vert', 'shaders/lut.frag');

        this.noiseImageShape = await loadImage('textures/T_Noise_18.PNG');
        this.noiseImage = await loadImage('textures/TilingNoise05.PNG');

        this.lutTexture = await loadImage('lut_textures/800T Night 03.png');
        
        // this.noiseImage = await loadImage('textures/T_Noise_18.PNG');
    }

    async addImage(imageUrl, minRatio, maxRatio) {
        let newImg = await loadImage(imageUrl);
        this.images.push(newImg);
        this.collageProfiles.push(new CollageProfile(minRatio, maxRatio));
    }

    FboSwap() {
        this.swapState = !this.swapState;

        if (this.swapState) {
            this.sourceBuffer = this.frameBufferA;
            this.targetBuffer = this.frameBufferB;
        }
        else {
            this.sourceBuffer = this.frameBufferB;
            this.targetBuffer = this.frameBufferA;
        }
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

    drawImage(_x, _y, _w, _h, _rotateDegree = 0, _imageIndex = -1) {

        let targetImgIndex = _imageIndex;
        if (_imageIndex == -1) {
            targetImgIndex = floor(random(0, this.images.length));
        }

        // image mask pass: generated the teared texture
        this.imgPieceBuffer.resize(_w, _h);
        this.maskedImagePass(this.imgPieceBuffer, targetImgIndex, 0.2, 0.1);

        // draw on the source layer
        this.sourceBuffer.begin();
        push();
        translate(_x + _w / 2, _y + _h / 2);
        rotate(radians(_rotateDegree));
        image(this.imgPieceBuffer, 0, 0, _w, _h);
        pop();
        this.sourceBuffer.end();

        // apply outline
        this.blurOutlinePass(this.sourceBuffer, this.targetBuffer, [1.0, 1.0, 1.0, 1.0]);
        this.FboSwap();
        
        // apply shadow
        this.shadowPass(this.sourceBuffer, this.targetBuffer, [-10.0, -10.0], 6.0, [0.0, 0.0, 0.0, 0.6]);
        this.FboSwap();

        // apply lut
        this.lutPass(this.sourceBuffer, this.targetBuffer, this.lutTexture, 1.0);
        this.FboSwap();

        // image(this.sourceBuffer, 0, 0, width, height);
        image(this.sourceBuffer, 0, 0, width, height);
        this.clearBuffers();
    }

    // outline pass using simple circle sampling
    circleOutlinePass(_sourceBuffer, _targetBuffer, _outlineColor = [1.0, 1.0, 1.0, 1.0]) {
        _targetBuffer.begin();
        clear();
        shader(this.outlineShaderProgram);
        this.outlineShaderProgram.setUniform('uMainTexture', _sourceBuffer);
        this.outlineShaderProgram.setUniform('uResolution', [_targetBuffer.width, _targetBuffer.height]);
        this.outlineShaderProgram.setUniform('uThickness', this._outlineThickness);
        this.outlineShaderProgram.setUniform('uOutlineColor', _outlineColor.slice(0, 3)); // rgb only
        noStroke();
        rect(0, 0, _targetBuffer.width, _targetBuffer.height);
        _targetBuffer.end();
    }

    // outline pass using separable gaussian blur + threshold
    blurOutlinePass(_sourceBuffer, _targetBuffer, _outlineColor = [1.0, 1.0, 1.0, 1.0]) {
        // Pass 1: Blur Horizontal
        // We need an intermediate buffer for the blur passes
        if (!this.blurBuffer) this.blurBuffer = createFramebuffer();
        
        this.blurBuffer.resize(ceil(_targetBuffer.width * 0.5), ceil(_targetBuffer.height * 0.5));
        
        // Blur Pass 1 (Horizontal) -> source to blurBuffer
        this.blurBuffer.begin();
        clear();
        shader(this.blurShader);
        this.blurShader.setUniform('uMainTexture', _sourceBuffer);
        this.blurShader.setUniform('uResolution', [this.blurBuffer.width, this.blurBuffer.height]);
        this.blurShader.setUniform('uDirection', [1.0, 0.0]);
        // Scale blur size down since buffer is smaller
        this.blurShader.setUniform('uBlurSize', this._outlineThickness * 0.5 * 0.5); 
        this.blurShader.setUniform('uBlurQuality', this._outlineQualityLevel);

        noStroke();
        rect(0, 0, this.blurBuffer.width, this.blurBuffer.height);
        this.blurBuffer.end();

        
        // Blur Pass 2 (Vertical) -> blurBuffer to blurBuffer2 (temp)
        if (!this.blurBuffer2) this.blurBuffer2 = createFramebuffer();
        this.blurBuffer2.resize(this.blurBuffer.width, this.blurBuffer.height);
        
        this.blurBuffer2.begin();
        clear();
        shader(this.blurShader);
        this.blurShader.setUniform('uMainTexture', this.blurBuffer);
        this.blurShader.setUniform('uResolution', [this.blurBuffer2.width, this.blurBuffer2.height]);
        this.blurShader.setUniform('uDirection', [0.0, 1.0]);
        this.blurShader.setUniform('uBlurSize', this._outlineThickness * 0.5 * 0.5);
        this.blurShader.setUniform('uBlurQuality', this._outlineQualityLevel);
        noStroke();
        rect(0, 0, this.blurBuffer2.width, this.blurBuffer2.height);
        this.blurBuffer2.end();
        
        // Threshold Pass -> Combine Original (_sourceBuffer) and Blurred (blurBuffer2) into _targetBuffer
        _targetBuffer.begin();
        clear();
        shader(this.thresholdShader);
        this.thresholdShader.setUniform('uMainTexture', _sourceBuffer); // Original sharp image
        this.thresholdShader.setUniform('uBlurTexture', this.blurBuffer2); // Blurred mask
        this.thresholdShader.setUniform('uNoiseTexture', this.noiseImage); // Noise texture
        
        this.thresholdShader.setUniform('uResolution', [_targetBuffer.width, _targetBuffer.height]);
        this.thresholdShader.setUniform('uOutlineColor', _outlineColor.slice(0, 3)); // rgb only
        
        this.thresholdShader.setUniform('uBaseThreshold', 0.1); 
        this.thresholdShader.setUniform('uNoiseThreshold', 0.6); 
        this.thresholdShader.setUniform('uEdgeSharpness', 0.96); 
        
        // Random noise offset for variety
        this.thresholdShader.setUniform('uNoiseOffset', [random(-100.0, 100.0), random(-100.0, 100.0)]);
        this.thresholdShader.setUniform('uNoiseScale', [this._outlineNoiseScale, this._outlineNoiseScale]);

        noStroke();
        rect(0, 0, _targetBuffer.width, _targetBuffer.height);
        _targetBuffer.end();
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

    setTextureWrap (_texture, _wrapS = CLAMP, _wrapT = null) {
        if(_wrapT == null)
            _wrapT = _wrapS;

        let renderer = p5.instance._renderer;
        let p5Tex = renderer.getTexture(_texture);
        
        if(p5Tex) {
            p5Tex.setWrapMode(_wrapS, _wrapT);
        }
    }

    outlineWeight (_thickness) {
        this._outlineThickness = _thickness;
        this._doOutline = true;
    }

    outlineQuality (_qualityLevel) {
        this._outlineQualityLevel = _qualityLevel;
    }

    outlineNoiseScale (_scale) {
        this._outlineNoiseScale = _scale;
    }

    noOutline () {
        this._doOutline = false;
    }


}

class CollageProfile {
    constructor(minRatio, maxRatio) {
        this.minRatio = minRatio;
        this.maxRatio = maxRatio;
    }
}