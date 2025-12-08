class Collager {
    constructor() {

        this.images = [];
        this.collageProfiles = [];

        // buffers
        this._baseShapeBuffer = createFramebuffer();
        this._outlineGradientBuffer = createFramebuffer();
        this._finalShapeBuffer = createFramebuffer();
        this._collageBuffer = createFramebuffer();

        this._resultBuffer = new FrameBufferSet();

        // shape stuff
        this.shapeModel = new NYModel('shape');
        this.outlineModel = null;
        this._drawModelIndex = 0;

        // settings
        this._cutoutThickness = 60;
        this._cutoutNoiseScale = 0.6;
        this._baseCutoutRatio = 0.2;
        this._noiseCutoutRatio = 0.8;
        this._baseOutlineRatio = 0.2;
        this._noiseOutlineRatio = 0.8;
        this._outlineThickness = 10;
        this._outlineNoiseScale = 1.2;
        this._outlineQualityLevel = 1;
        this._doOutline = true;

        // shadow settings
        this._doShadow = false;
        this._shadowOffset = [10, 10];
        this._shadowColor = [0, 0, 0, 0.5];
        this._shadowBlur = 20;

        // rect related settings
        this._rectNoiseScale = 0.01;
        this._rectEdgeOffset = 10;
        this._rectPointCount = 120;
        this._rectRoundness = 0;

        // debug features
        this._isDebug = true;
        this._debugScale = 0.25;
    }

    async initSystem() {
        this._outlineGradientShader = await loadShader('shaders/outline_gradient.vert', 'shaders/outline_gradient.frag');
        this._shapeMaskShader = await loadShader('shaders/shape_mask_outline.vert', 'shaders/shape_mask_outline.frag');
        this._fillShapeShader = await loadShader('shaders/fill_shape.vert', 'shaders/fill_shape.frag');

        this.outlineShaderProgram = await loadShader('shaders/outline.vert', 'shaders/outline.frag');
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

    resetBuffers() {
        this._baseShapeBuffer.remove();
        this._outlineGradientBuffer.remove();
        this._finalShapeBuffer.remove();
        this._collageBuffer.remove();

        this._baseShapeBuffer = createFramebuffer();
        this._outlineGradientBuffer = createFramebuffer();
        this._finalShapeBuffer = createFramebuffer();
        this._collageBuffer = createFramebuffer();
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

    clearBufferBindings() {
        const gl = p5.instance._renderer.GL;

        // Clear WebGL buffer bindings
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        // Reset all vertex attrib bindings
        const maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
        for (let i = 0; i < maxAttribs; i++) {
            gl.disableVertexAttribArray(i);
        }

        if(gl.bindVertexArray)
            gl.bindVertexArray(null);

        gl.useProgram(null);
    }

    clearImages() {
        this.images = [];
        this.collageProfiles = [];
    }


    drawVertexShape(_edgePointsArray) {
        // 1. Build Shape Model
        this._setShapeByEdgePoints(_edgePointsArray);

        // 2. Prepare Image
        let imageIndex = floor(random(0, this.images.length));
        let targetImg = this.images[imageIndex];
        let targetProfile = this.collageProfiles[imageIndex];

        // 3. Calculate UVs
        // For vertex shape (full screen), we map the screen coordinates to UV.
        // We need to calculate the bounding box of the shape to determine UV scale/offset?
        // OR we just use a random crop for the whole screen?
        // Let's assume we fit the image to the bounding box of the vertex shape.

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let p of _edgePointsArray) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
        let shapeW = maxX - minX;
        let shapeH = maxY - minY;

        let drawScale = random(targetProfile.minRatio, targetProfile.maxRatio);
        let uvInfos = calculateUVInfosCoverMode(shapeW, shapeH, targetImg.width, targetImg.height, drawScale);

        // 4. Draw to Buffer (Full Screen)
        this._processTearingEffect(targetImg, [uvInfos.uvOffsetX, uvInfos.uvOffsetY], [uvInfos.uvScaleX, uvInfos.uvScaleY]);

        // 5. Draw to Screen
        // Since we drew into full screen buffer, we just composite it.
        push();
        imageMode(CORNER);
        image(this._finalShapeBuffer, -width / 2, -height / 2, width, height);
        pop();

        if (this._isDebug) {
            this.drawDebug();
        }
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
        this._processTearingEffect(targetImg, [uvInfos.uvOffsetX, uvInfos.uvOffsetY], [uvInfos.uvScaleX, uvInfos.uvScaleY]);

        // 4. Draw to Screen
        push();
        translate(_x, _y); // Center of rect
        rotate(radians(_rotateDegree));

        // Draw the full buffer centered. 
        image(this._finalShapeBuffer, 0, 0);

        pop();

        if (this._isDebug) {
            this.drawDebug();
        }
    }

    _setShapeByEdgePoints(_edgePointsArray) {
        this.shapeModel.clear();
        this.shapeModel = new NYModel('shape_' + this._drawModelIndex++);
        this.shapeModel.addTrianglesByEdgePoints(_edgePointsArray);
        this.shapeModel.normalizeUV();
    }

    _processTearingEffect(_imageData, _uvOffset = [0.0, 0.0], _uvScale = [1.0, 1.0]) {

        let baseBuffer = this._baseShapeBuffer;
        let outlineBuffer = this._outlineGradientBuffer;
        let finalBuffer = this._finalShapeBuffer;
        
        let bufferW = baseBuffer.width;
        let bufferH = baseBuffer.height;

        let quadModel = NYModel.generateFullScreenQuadModel(bufferW, bufferH);

        // generate outline model
        let outlineModel = this.shapeModel.generateOutlineModel(this._cutoutThickness, this._outlineThickness);

        // Build Geometries
        let shapeGeom = this.shapeModel.build();
        let outlineGeom = outlineModel.build();
        let quadGeom = quadModel.build();

        // draw outline gradient for use
        outlineBuffer.begin();
        clear();
        background(0, 0, 100);

        // fill inside
        shader(this._fillShapeShader);
        this._fillShapeShader.setUniform('uFillColor', [0.0, 0.0, 0.0, 1.0]);
        model(shapeGeom);
        resetShader();

        shader(this._outlineGradientShader);
        model(outlineGeom);

        resetShader();
        outlineBuffer.end();


        // draw the basic image on the result buffer
        baseBuffer.begin();
        clear();

        shader(this.textureShader);
        // shader(this.debugShader);
        this.textureShader.setUniform('uMainTexture', _imageData);
        this.textureShader.setUniform('uTextureOffset', _uvOffset);
        this.textureShader.setUniform('uTextureScale', _uvScale);

        model(shapeGeom);

        resetShader();
        baseBuffer.end();

        // final composite the shape
        let collageBuffer = this._collageBuffer;
        
        collageBuffer.begin();
        clear();

        shader(this._shapeMaskShader);
        this._shapeMaskShader.setUniform('uMainTexture', baseBuffer);
        this._shapeMaskShader.setUniform('uGradientTexture', outlineBuffer);

        this.setTextureWrap(this.noiseImage, REPEAT);
        this.setTextureWrap(this.noiseImage, REPEAT);
        this._shapeMaskShader.setUniform('uCutoutNoiseTexture', this.noiseImage);
        this._shapeMaskShader.setUniform('uOutlineNoiseTexture', this.noiseImage);

        this._shapeMaskShader.setUniform('uCutoutNoiseScale', [this._cutoutNoiseScale, this._cutoutNoiseScale]);
        this._shapeMaskShader.setUniform('uOutlineNoiseScale', [this._outlineNoiseScale, this._outlineNoiseScale]);

        this._shapeMaskShader.setUniform('uCutoutNoiseOffset', [random(-1000.0, 1000.0), random(-1000.0, 1000.0)]);
        this._shapeMaskShader.setUniform('uOutlineNoiseOffset', [random(-1000.0, 1000.0), random(-1000.0, 1000.0)]);

        this._shapeMaskShader.setUniform('uCutoutRatio', this._baseCutoutRatio);
        this._shapeMaskShader.setUniform('uNoiseCutoutRatio', this._noiseCutoutRatio);

        if (this._doOutline) {
            this._shapeMaskShader.setUniform('uOutlineRatio', this._baseOutlineRatio);
            this._shapeMaskShader.setUniform('uNoiseOutlineRatio', this._noiseOutlineRatio);
        } else {
            this._shapeMaskShader.setUniform('uOutlineRatio', 0.0);
            this._shapeMaskShader.setUniform('uNoiseOutlineRatio', 0.0);
        }

        this._shapeMaskShader.setUniform('uOutlineColor', [1.0, 1.0, 1.0]);
        this._shapeMaskShader.setUniform('uEdgeSharpness', 0.95);

        model(quadGeom);
        resetShader();
        collageBuffer.end();

        // Shadow Pass
        finalBuffer.begin();
        clear();
        
        if(this._doShadow) {
            shader(this.shadowShader);
            this.shadowShader.setUniform('uMainTexture', collageBuffer);
            this.shadowShader.setUniform('uTextureSize', [finalBuffer.width, finalBuffer.height]);
            this.shadowShader.setUniform('uShadowOffset', this._shadowOffset);
            this.shadowShader.setUniform('uBlurRadius', this._shadowBlur);
            this.shadowShader.setUniform('uShadowColor', this._shadowColor);
            this.shadowShader.setUniform('uShadowOpacity', 1.0); // Alpha is handled in uShadowColor
            this.shadowShader.setUniform('uBlurQuality', 2.0); // Medium quality
            
            model(quadGeom);
        }
        else {
             shader(this.textureShader);
             this.textureShader.setUniform('uMainTexture', collageBuffer);
             this.textureShader.setUniform('uTextureOffset', [0.0, 0.0]);
             this.textureShader.setUniform('uTextureScale', [1.0, 1.0]);
             model(quadGeom);
        }
        
        resetShader();
        finalBuffer.end();
        
        // Clean up geometries to prevent memory leaks
        p5.instance.freeGeometry(shapeGeom);
        p5.instance.freeGeometry(outlineGeom);
        // Note: quadGeom is reused (constant GID), so we don't free it to leverage caching.
        // However, if buffer size changes, we might want to manage it differently.
        // For now, assuming fixed buffer size, letting p5 cache it is fine.
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

    cutoutRatio(_baseRatio, _noiseRatio) {
        this._baseCutoutRatio = _baseRatio;
        this._noiseCutoutRatio = _noiseRatio;
    }

    outlineRatio(_baseRatio, _noiseRatio) {
        this._baseOutlineRatio = _baseRatio;
        this._noiseOutlineRatio = _noiseRatio;
    }

    cutoutThickness(_thickness) {
        this._cutoutThickness = _thickness;
    }

    cutoutNoiseScale(_scale) {
        this._cutoutNoiseScale = _scale;
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

    // Shadow Settings
    shadow(_offsetX, _offsetY, _blur, _color = [0, 0, 0], _alpha = 0.5) {
        this._doShadow = true;
        this._shadowOffset = [_offsetX, _offsetY];
        this._shadowBlur = _blur;
        
        // Handle color input (array or p5 color or separate components)
        // Assuming array [r,g,b] or [r,g,b,a] passed, or just [r,g,b] and alpha separate.
        // User asked for "shadow color, shadow blur size, shadow alpha"
        // Let's store as [r, g, b, a]
        let r = _color[0];
        let g = _color[1];
        let b = _color[2];
        // if color has 4 components, use that alpha, else use _alpha
        let a = _color.length > 3 ? _color[3] : _alpha;
        
        this._shadowColor = [r, g, b, a];
    }

    shadowOffset(_x, _y) {
        this._shadowOffset = [_x, _y];
        this._doShadow = true;
    }

    shadowColor(_r, _g, _b, _a = 0.5) {
        if (Array.isArray(_r)) {
            this._shadowColor = _r;
            if (this._shadowColor.length === 3) {
                 this._shadowColor.push(_a);
            }
        } else {
            this._shadowColor = [_r, _g, _b, _a];
        }
        this._doShadow = true;
    }

    shadowBlur(_radius) {
        this._shadowBlur = _radius;
        this._doShadow = true;
    }

    shadowAlpha(_a) {
        this._shadowColor[3] = _a;
        this._doShadow = true;
    }

    noShadow() {
        this._doShadow = false;
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
        
        let drawW, drawH;
        let displayBaseBuffer = this._baseShapeBuffer;
        let displayOutlineBuffer = this._outlineGradientBuffer;
        let displayFinalBuffer = this._finalShapeBuffer;

        drawW = width * this._debugScale;
        drawH = height * this._debugScale;

        // Draw background for debug area to make it visible
        noStroke();
        fill(0, 0, 0, 0.5); // semi-transparent black
        rectMode(CORNER);
        rect(startX, startY, drawW, drawH * 4);

        // Draw _baseShapeBuffer
        imageMode(CORNER);
        // We need to flip Y because typically framebuffers are flipped? 
        // Or just standard image draw.
        // P5 images are usually fine.

        image(displayBaseBuffer, startX, startY, drawW, drawH);

        // Draw _outlineGradientBuffer
        image(displayOutlineBuffer, startX, startY + drawH, drawW, drawH);

        // Draw _collageBuffer
        image(this._collageBuffer, startX, startY + drawH * 2, drawW, drawH);

        // Draw _finalShapeBuffer
        image(displayFinalBuffer, startX, startY + drawH * 3, drawW, drawH);

        // Add labels
        fill(255);
        textSize(16);
        textFont(this.fontResource);
        textAlign(LEFT, TOP);
        text("Base Shape", startX + 10, startY + 10);
        text("Outline Grad", startX + 10, startY + drawH + 10);
        text("Collage Pass", startX + 10, startY + drawH * 2 + 10);
        text("Final Shape", startX + 10, startY + drawH * 3 + 10);

        pop();
    }

}

class CollageProfile {
    constructor(minRatio, maxRatio) {
        this.minRatio = minRatio;
        this.maxRatio = maxRatio;
    }
}