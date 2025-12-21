const basePath = document.currentScript.src.substring(0, document.currentScript.src.lastIndexOf('/'));

class Collager {
    constructor() {

        this.images = [];
        this.collageProfiles = [];

        // graphic reference
        this._targetGraphics = null;

        // buffers
        this._baseShapeBuffer = createFramebuffer();
        this._outlineGradientBuffer = createFramebuffer();
        this._finalShapeBuffer = createFramebuffer();
        this._insideShapeMaskBuffer = createFramebuffer();
        this._outlineShapeMaskBuffer = createFramebuffer();
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

        // LUT settings
        this._doLut = false;
        this._lutTexture = null;
        this._lutIntensity = 1.0;

        // debug features
        this._isDebug = false;
        this._debugScale = 0.25;

        this._lastBufferScale = 1.0;
    }

    async initSystem() {
        this._outlineGradientShader = await loadShader(`${basePath}/shaders/outline_gradient.vert`, `${basePath}/shaders/outline_gradient.frag`);
        this._shapeMaskShader = await loadShader(`${basePath}/shaders/shape_mask_outline.vert`, `${basePath}/shaders/shape_mask_outline.frag`);
        this._fillShapeShader = await loadShader(`${basePath}/shaders/fill_shape.vert`, `${basePath}/shaders/fill_shape.frag`);

        // this.outlineShaderProgram = await loadShader(`${basePath}/shaders/outline.vert`, `${basePath}/shaders/outline.frag`);
        // this.blurShader = await loadShader(`${basePath}/shaders/blur.vert`, `${basePath}/shaders/blur.frag`);
        // this.thresholdShader = await loadShader(`${basePath}/shaders/threshold.vert`, `${basePath}/shaders/threshold.frag`);
        this.debugShader = await loadShader(`${basePath}/shaders/debug.vert`, `${basePath}/shaders/debug.frag`);

        this.shadowShader = await loadShader(`${basePath}/shaders/shadow.vert`, `${basePath}/shaders/shadow.frag`);

        this.textureShader = await loadShader(`${basePath}/shaders/texture.vert`, `${basePath}/shaders/texture.frag`);
        this.textureLutShader = await loadShader(`${basePath}/shaders/texture.vert`, `${basePath}/shaders/texture_lut.frag`);

        this.noiseImageShape = await loadImage(`${basePath}/textures/T_Noise_18.PNG`);
        this.noiseImage = await loadImage(`${basePath}/textures/TilingNoise05.PNG`);

        // this.lutTexture = await loadImage(`${basePath}/lut_textures/800T Night 03.png`);
        // this.noiseImage = await loadImage(`${basePath}/textures/T_Noise_18.PNG`);

        this.fontResource = await loadFont(`${basePath}/fonts/Monospace.ttf`);
    }

    // disable for now
    // setTargetGraphics(_graphics) {
    //     this._targetGraphics = _graphics;
    // }

    async addImage(imageUrl, minRatio, maxRatio) {
        let newImg = await loadImage(imageUrl);
        this.images.push(newImg);
        this.collageProfiles.push(new CollageProfile(minRatio, maxRatio));
    }

    resetBuffers() {
        this._baseShapeBuffer.remove();
        this._outlineGradientBuffer.remove();
        this._finalShapeBuffer.remove();
        this._insideShapeMaskBuffer.remove();
        this._outlineShapeMaskBuffer.remove();
        this._collageBuffer.remove();

        this._baseShapeBuffer = createFramebuffer();
        this._outlineGradientBuffer = createFramebuffer();
        this._finalShapeBuffer = createFramebuffer();
        this._insideShapeMaskBuffer = createFramebuffer();
        this._outlineShapeMaskBuffer = createFramebuffer();
        this._collageBuffer = createFramebuffer();
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

        if (gl.bindVertexArray)
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
        if (this._targetGraphics != null) {
            this._targetGraphics.push();
            this._targetGraphics.imageMode(CENTER);
            this._targetGraphics.image(this._finalShapeBuffer, 0, 0, width, height);
            this._targetGraphics.pop();
        }
        else {
            push();
            imageMode(CENTER);
            image(this._finalShapeBuffer, 0, 0, width, height);
            pop();
        }

        if (this._isDebug) {
            this.drawDebug();
        }
    }

    redrawVertexShape() {
        push();
        imageMode(CENTER);
        image(this._finalShapeBuffer, 0, 0, width, height);
        pop();
    }

    redrawVertexShapeInsideMask() {
        push();
        imageMode(CENTER);
        image(this._insideShapeMaskBuffer, 0, 0, width, height);
        pop();
    }

    redrawVertexShapeOutlineMask() {
        push();
        imageMode(CENTER);
        image(this._outlineShapeMaskBuffer, 0, 0, width, height);
        pop();
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
        if (this._targetGraphics != null) {
            this._targetGraphics.push();

            this._targetGraphics.translate(_x, _y);
            this._targetGraphics.rotate(radians(_rotateDegree));

            this._targetGraphics.imageMode(CENTER);
            this._targetGraphics.image(this._finalShapeBuffer, 0, 0);

            this._targetGraphics.pop();
        }
        else {
            push();
            translate(_x, _y); // Center of rect
            rotate(radians(_rotateDegree));

            // Draw the full buffer centered. 
            imageMode(CENTER);
            image(this._finalShapeBuffer, 0, 0);

            pop();
        }

        if (this._isDebug) {
            this.drawDebug();
        }
    }

    redrawRect(_x, _y, _w, _h, _rotateDegree = 0) {
        push();
        translate(_x, _y); // Center of rect
        rotate(radians(_rotateDegree));

        imageMode(CENTER);
        image(this._finalShapeBuffer, 0, 0);
        pop();
    }

    redrawRectInsideMask(_x, _y, _w, _h, _rotateDegree = 0) {
        push();
        translate(_x, _y); // Center of rect
        rotate(radians(_rotateDegree));

        // Draw the full buffer centered. 
        imageMode(CENTER);
        image(this._insideShapeMaskBuffer, 0, 0);

        pop();
    }

    redrawRectOutlineMask(_x, _y, _w, _h, _rotateDegree = 0) {
        push();
        translate(_x, _y); // Center of rect
        rotate(radians(_rotateDegree));

        // Draw the full buffer centered. 
        imageMode(CENTER);
        image(this._outlineShapeMaskBuffer, 0, 0);

        pop();
    }

    drawCustomShape(_edgePointsArray, _x, _y, _rotateDegree = 0) {
        // 1. Calculate bounding box and center
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let p of _edgePointsArray) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
        let centerX = (minX + maxX) / 2;
        let centerY = (minY + maxY) / 2;
        let shapeW = maxX - minX;
        let shapeH = maxY - minY;

        // Determine buffer scale for better resolution on small shapes
        let bufferScale = 1.0;
        if (shapeW < 400 || shapeH < 400) {
            bufferScale = min(4.0, 800 / max(shapeW, shapeH));
        }
        this._lastBufferScale = bufferScale;

        // 2. Shift and scale points
        let processedPoints = _edgePointsArray.map(p => ({
            x: (p.x - centerX) * bufferScale,
            y: (p.y - centerY) * bufferScale
        }));

        // 3. Build Shape Model
        this._setShapeByEdgePoints(processedPoints);

        // 4. Prepare Image
        let imageIndex = floor(random(0, this.images.length));
        let targetImg = this.images[imageIndex];
        let targetProfile = this.collageProfiles[imageIndex];

        let drawScale = random(targetProfile.minRatio, targetProfile.maxRatio);
        // Use scaled dimensions for UV calculation so the image doesn't look stretched
        let uvInfos = calculateUVInfosCoverMode(shapeW * bufferScale, shapeH * bufferScale, targetImg.width, targetImg.height, drawScale);

        // 5. Draw to Buffer
        this._processTearingEffect(targetImg, [uvInfos.uvOffsetX, uvInfos.uvOffsetY], [uvInfos.uvScaleX, uvInfos.uvScaleY]);

        // 6. Draw to Screen
        let drawW = width / bufferScale;
        let drawH = height / bufferScale;

        if (this._targetGraphics != null) {
            this._targetGraphics.push();
            this._targetGraphics.translate(_x, _y);
            this._targetGraphics.rotate(radians(_rotateDegree));
            this._targetGraphics.imageMode(CENTER);
            this._targetGraphics.image(this._finalShapeBuffer, 0, 0, drawW, drawH);
            this._targetGraphics.pop();
        }
        else {
            push();
            translate(_x, _y);
            rotate(radians(_rotateDegree));
            imageMode(CENTER);
            image(this._finalShapeBuffer, 0, 0, drawW, drawH);
            pop();
        }

        if (this._isDebug) {
            this.drawDebug();
        }
    }

    redrawCustomShape(_x, _y, _rotateDegree = 0) {
        let bufferScale = this._lastBufferScale || 1.0;
        push();
        translate(_x, _y);
        rotate(radians(_rotateDegree));
        imageMode(CENTER);
        image(this._finalShapeBuffer, 0, 0, width / bufferScale, height / bufferScale);
        pop();
    }

    redrawCustomShapeInsideMask(_x, _y, _rotateDegree = 0) {
        let bufferScale = this._lastBufferScale || 1.0;
        push();
        translate(_x, _y);
        rotate(radians(_rotateDegree));
        imageMode(CENTER);
        image(this._insideShapeMaskBuffer, 0, 0, width / bufferScale, height / bufferScale);
        pop();
    }

    redrawCustomShapeOutlineMask(_x, _y, _rotateDegree = 0) {
        let bufferScale = this._lastBufferScale || 1.0;
        push();
        translate(_x, _y);
        rotate(radians(_rotateDegree));
        imageMode(CENTER);
        image(this._outlineShapeMaskBuffer, 0, 0, width / bufferScale, height / bufferScale);
        pop();
    }

    /**
     * Draw an image with a curve-based mask and tearing effect
     * @param {p5.Image} _imageData - The image to draw
     * @param {Object} _curveData - The curve data JSON (compatible with CurveReader)
     * @param {number} _x - X position to draw at
     * @param {number} _y - Y position to draw at
     * @param {number} _scale - Scale factor for the curve/image (default 1.0)
     * @param {number} _rotateDegree - Rotation in degrees (default 0)
     * @param {number} _sampleCount - Number of points to sample from the curve (default 100)
     */
    drawMaskedImage(_imageData, _curveData, _x, _y, _drawSize = 1000.0, _rotateDegree = 0, _sampleCount = 100) {

        let _scale = _drawSize / max(_imageData.width, _imageData.height);

        // 1. Parse curve data using CurveReader
        const curveReader = new CurveReader(_curveData);
        
        // 2. Sample points along the curve to create edge points
        const edgePoints = [];
        for (let i = 0; i < _sampleCount; i++) {
            const t = i / _sampleCount;
            const point = curveReader.evaluateCurve(t);
            edgePoints.push({
                x: (point.x - 0.5 * _imageData.width) * _scale,
                y: (point.y - 0.5 * _imageData.height) * _scale
            });
        }

        // check if the points are in clockwise order
        if (!this._isClockwise(edgePoints)) {
            edgePoints.reverse();
        }

        this._setShapeByEdgePoints(edgePoints);
        this.shapeModel.normalizeUVByImageSize(_imageData.width, _imageData.height);

        let uvInfos = {
            uvOffsetX: 0.5,
            uvOffsetY: 0.5,
            uvScaleX: 1 / _scale,
            uvScaleY: 1 / _scale
        };
        
        // 7. Apply tearing effect
        this._processTearingEffect(_imageData, [uvInfos.uvOffsetX, uvInfos.uvOffsetY], [uvInfos.uvScaleX, uvInfos.uvScaleY]);
        
        // 8. Draw to screen at specified position and rotation
        if (this._targetGraphics != null) {
            this._targetGraphics.push();
            this._targetGraphics.translate(_x, _y);
            this._targetGraphics.rotate(radians(_rotateDegree));
            this._targetGraphics.imageMode(CENTER);
            this._targetGraphics.image(this._finalShapeBuffer, 0, 0);
            this._targetGraphics.pop();
        } else {
            push();
            translate(_x, _y);
            rotate(radians(_rotateDegree));
            imageMode(CENTER);
            image(this._finalShapeBuffer, 0, 0);
            pop();
        }
        
        if (this._isDebug) {
            this.drawDebug();
        }
    }

    /**
     * Redraw the last masked image result
     * @param {number} _x - X position
     * @param {number} _y - Y position
     * @param {number} _rotateDegree - Rotation in degrees (default 0)
     */
    redrawMaskedImage(_x, _y, _rotateDegree = 0) {
        push();
        translate(_x, _y);
        rotate(radians(_rotateDegree));
        imageMode(CENTER);
        image(this._finalShapeBuffer, 0, 0);
        pop();
    }

    /**
     * Redraw the inside mask of the last masked image
     * @param {number} _x - X position
     * @param {number} _y - Y position
     * @param {number} _rotateDegree - Rotation in degrees (default 0)
     */
    redrawMaskedImageInsideMask(_x, _y, _rotateDegree = 0) {
        push();
        translate(_x, _y);
        rotate(radians(_rotateDegree));
        imageMode(CENTER);
        image(this._insideShapeMaskBuffer, 0, 0);
        pop();
    }

    /**
     * Redraw the outline mask of the last masked image
     * @param {number} _x - X position
     * @param {number} _y - Y position
     * @param {number} _rotateDegree - Rotation in degrees (default 0)
     */
    redrawMaskedImageOutlineMask(_x, _y, _rotateDegree = 0) {
        push();
        translate(_x, _y);
        rotate(radians(_rotateDegree));
        imageMode(CENTER);
        image(this._outlineShapeMaskBuffer, 0, 0);
        pop();
    }

    _setShapeByEdgePoints(_edgePointsArray) {
        this.shapeModel.clear();
        this.shapeModel = new NYModel('shape_' + this._drawModelIndex++);
        this.shapeModel.addTrianglesByEdgePoints(_edgePointsArray);
        this.shapeModel.normalizeUV();
    }

    /**
     * Calculate UV mapping for image-space coordinates
     * When curve data is in image coordinate space, this maps the centered shape back to the image UVs
     * @param {number} imageWidth - Width of the source image
     * @param {number} imageHeight - Height of the source image
     * @param {number} centerX - The center X of the shape in image space (before centering)
     * @param {number} centerY - The center Y of the shape in image space (before centering)
     * @param {number} shapeW - Width of the shape bounding box
     * @param {number} shapeH - Height of the shape bounding box
     * @returns {Object} - Object with uvOffsetX, uvOffsetY, uvScaleX, uvScaleY
     */
    _calculateUVFromImageSpace(imageWidth, imageHeight, centerX, centerY, shapeW, shapeH) {
        return {
            uvOffsetX: 0,
            uvOffsetY: 0,
            uvScaleX: 1,
            uvScaleY: 1
        };
    }

    /**
     * Check if a polygon's points are in clockwise order
     * Uses the shoelace formula to calculate signed area
     * @param {Array} points - Array of points with x, y properties
     * @returns {boolean} - True if clockwise, false if counter-clockwise
     */
    _isClockwise(points) {
        if (points.length < 3) return true;
        
        let sum = 0;
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            sum += (p2.x - p1.x) * (p2.y + p1.y);
        }
        
        // Negative sum means clockwise in standard coordinates
        // (positive Y points down in canvas/screen coordinates)
        return sum < 0;
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
        this._fillShapeShader.setUniform('uUseTextureAlpha', 0);
        model(shapeGeom);
        resetShader();

        shader(this._outlineGradientShader);
        model(outlineGeom);

        resetShader();
        outlineBuffer.end();


        // draw the basic image on the result buffer
        baseBuffer.begin();
        clear();

        // Use texture shader with or without LUT
        shader(this.textureLutShader);
        
        this.textureLutShader.setUniform('uMainTexture', _imageData);
        this.textureLutShader.setUniform('uTextureOffset', _uvOffset);
        this.textureLutShader.setUniform('uTextureScale', _uvScale);
        
        // Set LUT uniforms if enabled
        if (this._doLut && this._lutTexture) {
            this.textureLutShader.setUniform('uDoLut', 1);
            this.textureLutShader.setUniform('uLutTexture', this._lutTexture);
            this.textureLutShader.setUniform('uLutIntensity', this._lutIntensity);
        } else if (this._doLut) {
            this.textureLutShader.setUniform('uDoLut', 0);
        }

        model(shapeGeom);

        resetShader();
        baseBuffer.end();

        // set the random values here, for later user
        let cutoutNoiseOffsetX = random(-1000.0, 1000.0);
        let cutoutNoiseOffsetY = random(-1000.0, 1000.0);
        let outlineNoiseOffsetX = random(-1000.0, 1000.0);
        let outlineNoiseOffsetY = random(-1000.0, 1000.0);
        // final composite the shape
        let collageBuffer = this._collageBuffer;

        collageBuffer.begin();
        clear();


        shader(this._shapeMaskShader);
        this._shapeMaskShader.setUniform('uMainTexture', baseBuffer);
        this._shapeMaskShader.setUniform('uGradientTexture', outlineBuffer);

        this._shapeMaskShader.setUniform('uDoFillColor', false);

        this.setTextureWrap(this.noiseImage, REPEAT);
        this.setTextureWrap(this.noiseImage, REPEAT);
        this._shapeMaskShader.setUniform('uCutoutNoiseTexture', this.noiseImage);
        this._shapeMaskShader.setUniform('uOutlineNoiseTexture', this.noiseImage);

        this._shapeMaskShader.setUniform('uCutoutNoiseScale', [this._cutoutNoiseScale, this._cutoutNoiseScale]);
        this._shapeMaskShader.setUniform('uOutlineNoiseScale', [this._outlineNoiseScale, this._outlineNoiseScale]);

        this._shapeMaskShader.setUniform('uCutoutNoiseOffset', [cutoutNoiseOffsetX, cutoutNoiseOffsetY]);
        this._shapeMaskShader.setUniform('uOutlineNoiseOffset', [outlineNoiseOffsetX, outlineNoiseOffsetY]);

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

        // Generate inside shape mask (without outline)
        this._insideShapeMaskBuffer.begin();
        clear();

        shader(this._shapeMaskShader);
        this._shapeMaskShader.setUniform('uMainTexture', baseBuffer);
        this._shapeMaskShader.setUniform('uGradientTexture', outlineBuffer);

        this._shapeMaskShader.setUniform('uDoFillColor', true);
        this._shapeMaskShader.setUniform('uFillColor', [1.0, 1.0, 1.0, 1.0]);

        this.setTextureWrap(this.noiseImage, REPEAT);
        this.setTextureWrap(this.noiseImage, REPEAT);
        this._shapeMaskShader.setUniform('uCutoutNoiseTexture', this.noiseImage);
        this._shapeMaskShader.setUniform('uOutlineNoiseTexture', this.noiseImage);

        this._shapeMaskShader.setUniform('uCutoutNoiseScale', [this._cutoutNoiseScale, this._cutoutNoiseScale]);
        this._shapeMaskShader.setUniform('uOutlineNoiseScale', [this._outlineNoiseScale, this._outlineNoiseScale]);

        this._shapeMaskShader.setUniform('uCutoutNoiseOffset', [cutoutNoiseOffsetX, cutoutNoiseOffsetY]);
        this._shapeMaskShader.setUniform('uOutlineNoiseOffset', [outlineNoiseOffsetX, outlineNoiseOffsetY]);

        this._shapeMaskShader.setUniform('uCutoutRatio', this._baseCutoutRatio);
        this._shapeMaskShader.setUniform('uNoiseCutoutRatio', this._noiseCutoutRatio);

        // no outline
        this._shapeMaskShader.setUniform('uOutlineRatio', 0.0);
        this._shapeMaskShader.setUniform('uNoiseOutlineRatio', 0.0);

        this._shapeMaskShader.setUniform('uOutlineColor', [1.0, 1.0, 1.0]);
        this._shapeMaskShader.setUniform('uEdgeSharpness', 0.95);

        model(quadGeom);
        resetShader();
        this._insideShapeMaskBuffer.end();

        // Generate outline shape mask (with outline)
        this._outlineShapeMaskBuffer.begin();
        clear();
        
        shader(this._fillShapeShader);
        this._fillShapeShader.setUniform('uFillColor', [1.0, 1.0, 1.0, 1.0]);
        this._fillShapeShader.setUniform('uMainTexture', collageBuffer);
        this._fillShapeShader.setUniform('uUseTextureAlpha', 1);
        model(quadGeom);
        resetShader();
        this._outlineShapeMaskBuffer.end();

        // Shadow Pass
        finalBuffer.begin();
        clear();

        if (this._doShadow) {
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

    // LUT Settings
    setLutTexture(_lutTexture) {
        this._lutTexture = _lutTexture;
        this._doLut = true;
    }

    setLutIntensity(_intensity) {
        this._lutIntensity = _intensity;
        this._doLut = true;
    }

    noLut() {
        this._doLut = false;
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

        // Calculate how many debug views can fit per column
        let totalDebugViews = 6;
        let maxRowsPerColumn = max(1, floor(height / drawH));
        let columnsNeeded = ceil(totalDebugViews / maxRowsPerColumn);

        // Array of buffers and their labels
        let debugItems = [
            { buffer: displayBaseBuffer, label: "Base Shape" },
            { buffer: displayOutlineBuffer, label: "Outline Grad" },
            { buffer: this._collageBuffer, label: "Collage Pass" },
            { buffer: this._insideShapeMaskBuffer, label: "Inside Mask" },
            { buffer: this._outlineShapeMaskBuffer, label: "Outline Mask" },
            { buffer: displayFinalBuffer, label: "Final Shape" }
        ];

        // Draw background for debug area to make it visible
        noStroke();
        fill(0, 0, 0, 0.5); // semi-transparent black
        rectMode(CORNER);
        rect(startX, startY, drawW * columnsNeeded, min(height, drawH * totalDebugViews));

        // Draw each debug view
        imageMode(CORNER);
        fill(255);
        textSize(16);
        textFont(this.fontResource);
        textAlign(LEFT, TOP);

        for (let i = 0; i < debugItems.length; i++) {
            let col = floor(i / maxRowsPerColumn);
            let row = i % maxRowsPerColumn;
            
            let x = startX + col * drawW;
            let y = startY + row * drawH;

            // Draw the buffer
            image(debugItems[i].buffer, x, y, drawW, drawH);

            // Draw the label
            text(debugItems[i].label, x + 10, y + 10);
        }

        pop();
    }

}

class CollageProfile {
    constructor(minRatio, maxRatio) {
        this.minRatio = minRatio;
        this.maxRatio = maxRatio;
    }
}