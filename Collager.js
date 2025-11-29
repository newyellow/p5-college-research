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
        this.outlineThickness = 10;
    }

    async initShaders() {
        this.outlineShaderProgram = await loadShader('shaders/outline.vert', 'shaders/outline.frag');
        this.maskShader = await loadShader('shaders/mask.vert', 'shaders/mask.frag');
        this.blurShader = await loadShader('shaders/blur.vert', 'shaders/blur.frag');
        this.thresholdShader = await loadShader('shaders/threshold.vert', 'shaders/threshold.frag');
        this.shadowShader = await loadShader('shaders/shadow.vert', 'shaders/shadow.frag');

        this.noiseImageShape = await loadImage('textures/T_Noise_18.PNG');
        this.noiseImage = await loadImage('textures/TilingNoise05.PNG');
        // this.noiseImage = await loadImage('textures/T_Noise_18.PNG');

        // Set texture wrapping to REPEAT
        textureWrap(REPEAT);
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
        this.circleOutlinePass(this.sourceBuffer, this.targetBuffer, this.outlineThickness, [1.0, 1.0, 1.0, 1.0]);
        this.FboSwap();
        
        // apply shadow
        this.shadowPass(this.sourceBuffer, this.targetBuffer, [-10.0, -10.0], 6.0, [0.0, 0.0, 0.0, 0.6]);
        this.FboSwap();

        // image(this.sourceBuffer, 0, 0, width, height);
        image(this.sourceBuffer, 0, 0, width, height);
        this.clearBuffers();
    }

    // outline pass using simple circle sampling
    circleOutlinePass(_sourceBuffer, _targetBuffer, _outlineThickness = 24.0, _outlineColor = [1.0, 1.0, 1.0, 1.0]) {
        _targetBuffer.begin();
        clear();
        shader(this.outlineShaderProgram);
        this.outlineShaderProgram.setUniform('uMainTexture', _sourceBuffer);
        this.outlineShaderProgram.setUniform('uResolution', [_targetBuffer.width, _targetBuffer.height]);
        this.outlineShaderProgram.setUniform('uThickness', _outlineThickness);
        this.outlineShaderProgram.setUniform('uOutlineColor', _outlineColor.slice(0, 3)); // rgb only
        noStroke();
        rect(0, 0, _targetBuffer.width, _targetBuffer.height);
        _targetBuffer.end();
    }

    // outline pass using separable gaussian blur + threshold
    blurOutlinePass(_sourceBuffer, _targetBuffer, _outlineThickness = 24.0, _outlineColor = [1.0, 1.0, 1.0, 1.0]) {
        // Pass 1: Blur Horizontal
        // We need an intermediate buffer for the blur passes
        if (!this.blurBuffer) this.blurBuffer = createFramebuffer();
        
        this.blurBuffer.resize(_targetBuffer.width, _targetBuffer.height);
        _targetBuffer.resize(_targetBuffer.width, _targetBuffer.height);
        
        // Blur Pass 1 (Horizontal) -> source to blurBuffer
        this.blurBuffer.begin();
        clear();
        shader(this.blurShader);
        this.blurShader.setUniform('uMainTexture', _sourceBuffer);
        this.blurShader.setUniform('uResolution', [_targetBuffer.width, _targetBuffer.height]);
        this.blurShader.setUniform('uDirection', [1.0, 0.0]);
        this.blurShader.setUniform('uBlurSize', _outlineThickness * 0.5); // Blur size proportional to thickness
        noStroke();
        rect(0, 0, _targetBuffer.width, _targetBuffer.height);
        this.blurBuffer.end();

        
        // Blur Pass 2 (Vertical) -> blurBuffer to blurBuffer2 (temp)
        if (!this.blurBuffer2) this.blurBuffer2 = createFramebuffer();
        this.blurBuffer2.resize(_targetBuffer.width, _targetBuffer.height);
        
        this.blurBuffer2.begin();
        clear();
        shader(this.blurShader);
        this.blurShader.setUniform('uMainTexture', this.blurBuffer);
        this.blurShader.setUniform('uResolution', [_targetBuffer.width, _targetBuffer.height]);
        this.blurShader.setUniform('uDirection', [0.0, 1.0]);
        this.blurShader.setUniform('uBlurSize', _outlineThickness * 0.5);
        noStroke();
        rect(0, 0, _targetBuffer.width, _targetBuffer.height);
        this.blurBuffer2.end();
        
        // Threshold Pass -> Combine Original (_sourceBuffer) and Blurred (blurBuffer2) into _targetBuffer
        _targetBuffer.begin();
        clear();
        shader(this.thresholdShader);
        this.thresholdShader.setUniform('uMainTexture', _sourceBuffer); // Original sharp image
        this.thresholdShader.setUniform('uBlurTexture', this.blurBuffer2); // Blurred mask
        this.thresholdShader.setUniform('uOutlineColor', _outlineColor.slice(0, 3)); // rgb only
        this.thresholdShader.setUniform('uThreshold', 0.1); // Cutoff value
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
        this.maskShader.setUniform('uMainTexture', targetImg);

        // Pass main texture transform
        this.maskShader.setUniform('uMainTextureOffset', [cropOffsetX, cropOffsetY]);
        this.maskShader.setUniform('uMainTextureScale', [cropScaleX, cropScaleY]); // Uniform scaling for now

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
}

class CollageProfile {
    constructor(minRatio, maxRatio) {
        this.minRatio = minRatio;
        this.maxRatio = maxRatio;
    }
}