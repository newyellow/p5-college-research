class WindowObject {
    constructor(_subRect, _windowDataSet, fadeInDelay = 0, fadeInDuration = 1000) {
        this.windowData = _windowDataSet;
        this.rect = _subRect;
        
        // Image transition properties
        this.currentImage = null;
        this.nextImage = null;
        this.isTransitioning = false;
        this.transitionStartTime = 0;
        this.transitionTime = 3000; // milliseconds
        this.transitionT = 0; // 0-1, transition progress
        
        // Drawing properties for current image
        this.currentImageScale = 1.0;
        this.currentImageRotation = 0;
        this.currentImageOffsetX = 0;
        this.currentImageOffsetY = 0;
        
        // Drawing properties for next image (during transition)
        this.nextImageScale = 1.0;
        this.nextImageRotation = 0;
        this.nextImageOffsetX = 0;
        this.nextImageOffsetY = 0;
        
        // Fade-in properties
        this.fadeInDelay = fadeInDelay; // milliseconds to wait before starting fade-in
        this.fadeInDuration = fadeInDuration; // milliseconds for fade-in animation
        this.fadeInStartTime = null; // set when fade-in begins
        this.fadeInT = 0; // 0-1, fade-in progress
        this.fadeInAlpha = 0; // 0-1, current alpha for drawing
        this.isFadedIn = false; // true when fade-in is complete
        this.systemStartTime = null; // set when system starts (for delay calculation)
        
        // Auto image change properties
        this.imageChangeIntervalMin = 3600; // min time between changes
        this.imageChangeIntervalMax = 12000; // max time between changes
        this.imageChangeTimer = random(1000, 2000) - this.fadeInDelay;
        // start low for fading
        this.currentImageChangeInterval = this._randomizeImageChangeInterval();
        this.canChangeImage = false; // true when timer has elapsed and ready for new image
    }

    drawWindowFrameImage() {
        // Note: tint is applied in drawObject(), so this draws with current tint
        noStroke();
        fill(0, 0, 100);
        this.rect.drawImage(this.windowData.imageData);
    }

    drawWindowShape() {
        this.rect.drawCurve(this.windowData.curveReader);
    }

    /**
     * Set a new image to display inside the window
     * Triggers a fade transition if an image is already set
     * @param {p5.Image} targetImage - The new image to display
     * @param {Number} scale - Scale for the image (default: 1.0)
     * @param {Number} rotation - Rotation in degrees (default: 0)
     */
    setInsideImage(targetImage, scale = 1.0, rotation = 0) {
        if (!targetImage) return;
        
        if (!this.currentImage) {
            // First image, no transition needed
            this.currentImage = targetImage;
            this.currentImageScale = scale;
            this.currentImageRotation = rotation;
            // Calculate offset once for current image
            let offsets = this._calculateImageOffset(targetImage, scale, rotation);
            this.currentImageOffsetX = offsets.x;
            this.currentImageOffsetY = offsets.y;
            this.isTransitioning = false;
            this.transitionT = 0;
            
        } else if (this.currentImage !== targetImage) {
            // Start transition to new image
            // Store the new image's scale and rotation separately
            this.nextImage = targetImage;
            this.nextImageScale = scale;
            this.nextImageRotation = rotation;
            // Calculate offset once for next image
            let offsets = this._calculateImageOffset(targetImage, scale, rotation);
            this.nextImageOffsetX = offsets.x;
            this.nextImageOffsetY = offsets.y;
            this.isTransitioning = true;
            this.transitionStartTime = millis();
            this.transitionT = 0;

            this.canChangeImage = false;
        }
    }

    /**
     * Start the fade-in system timer
     * Call this once when the system begins
     */
    startFadeIn() {
        if (this.systemStartTime === null) {
            this.systemStartTime = millis();
        }
    }

    update(_deltaTime = 16) {
        // Update fade-in state
        if (!this.isFadedIn && this.systemStartTime !== null) {
            let timeSinceStart = millis() - this.systemStartTime;
            
            // Check if delay period has passed
            if (timeSinceStart >= this.fadeInDelay) {
                // Start fade-in if not started
                if (this.fadeInStartTime === null) {
                    this.fadeInStartTime = millis();
                }
                
                // Calculate fade-in progress
                let fadeInElapsed = millis() - this.fadeInStartTime;
                this.fadeInT = constrain(fadeInElapsed / this.fadeInDuration, 0, 1);
                
                // Apply easing to fade-in (optional - can use linear or eased)
                // Using ease-in-out for smooth fade
                this.fadeInAlpha = this._easeInOutCubic(this.fadeInT);
                
                // Check if fade-in complete
                if (this.fadeInT >= 1.0) {
                    this.isFadedIn = true;
                    this.fadeInAlpha = 1.0;
                }
            } else {
                // Still in delay period
                this.fadeInAlpha = 0;
            }
        }
        
        // Update image transition state
        if (this.isTransitioning) {
            let elapsed = millis() - this.transitionStartTime;
            this.transitionT = constrain(elapsed / this.transitionTime, 0, 1);
            
            // Transition complete
            if (this.transitionT >= 1.0) {
                // Transfer next image properties to current
                this.currentImage = this.nextImage;
                this.currentImageScale = this.nextImageScale;
                this.currentImageRotation = this.nextImageRotation;
                this.currentImageOffsetX = this.nextImageOffsetX;
                this.currentImageOffsetY = this.nextImageOffsetY;
                
                // Clear next image properties
                this.nextImage = null;
                this.nextImageScale = 1.0;
                this.nextImageRotation = 0;
                this.nextImageOffsetX = 0;
                this.nextImageOffsetY = 0;
                
                this.isTransitioning = false;
                this.transitionT = 0;
            }
        }
        
        // Update image change timer
        // also counting while fading, it is easier to control the temple
        if (!this.isTransitioning) {
            // Increment timer with _deltaTime
            this.imageChangeTimer += _deltaTime;
            
            // Check if interval has passed
            if (this.imageChangeTimer >= this.currentImageChangeInterval) {
                this.canChangeImage = true;

                // randomize next interval
                this.currentImageChangeInterval = this._randomizeImageChangeInterval();
                this.imageChangeTimer = 0;
            }
        }
    }

    /**
     * Randomize the image change interval
     * @returns {Number} Random interval in milliseconds
     */
    _randomizeImageChangeInterval() {
        return random(this.imageChangeIntervalMin, this.imageChangeIntervalMax);
    }

    /**
     * Easing function for smooth fade-in
     */
    _easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    /**
     * Draw the complete window object (inside image + frame)
     * Applies fade-in alpha to the entire object
     */
    drawObject() {
        // Don't draw if fade-in hasn't started yet
        if (this.fadeInAlpha <= 0) return;
        
        push();
        
        // Apply fade-in alpha to everything
        tint(255, this.fadeInAlpha * 255);
        
        this.drawInsideImage();
        this.drawWindowFrameImage();
        
        noTint();
        pop();
    }

    /**
     * Draw the image inside the window mask with transition effects
     * Handles fade-to-white transition when changing images
     */
    drawInsideImage() {
        if (!this.currentImage && !this.nextImage) return;
        
        if (!this.isTransitioning) {
            // Normal drawing without transition
            this._drawImageInsideMaskInternal(this.currentImage, this.currentImageScale, this.currentImageRotation, 
                                             this.currentImageOffsetX, this.currentImageOffsetY, 1.0);
        } else {
            // Transition: fade out current -> white -> fade in next
            // transitionT: 0 -> 0.5 -> 1.0
            // Fade out: 0 -> 0.5 (opacity 1.0 -> 0.0)
            // Fade in: 0.5 -> 1.0 (opacity 0.0 -> 1.0)
            
            if (this.transitionT < 0.5) {
                // First half: fade out current image and fade in white
                let fadeT = this.transitionT * 2; // 0 -> 1
                let imageOpacity = 1.0 - fadeT;
                let whiteOpacity = fadeT;
                
                // Draw current image fading out WITH ITS ORIGINAL scale/rotation/offset
                if (this.currentImage) {
                    this._drawImageInsideMaskInternal(this.currentImage, this.currentImageScale, this.currentImageRotation,
                                                     this.currentImageOffsetX, this.currentImageOffsetY, imageOpacity);
                }
                
                // Draw white overlay fading in
                if (whiteOpacity > 0) {
                    this._drawWhiteOverlay(whiteOpacity);
                }
            } else {
                // Second half: fade out white and fade in next image
                let fadeT = (this.transitionT - 0.5) * 2; // 0 -> 1
                let whiteOpacity = 1.0 - fadeT;
                let imageOpacity = fadeT;
                
                // Draw next image fading in WITH ITS NEW scale/rotation/offset
                if (this.nextImage) {
                    this._drawImageInsideMaskInternal(this.nextImage, this.nextImageScale, this.nextImageRotation,
                                                     this.nextImageOffsetX, this.nextImageOffsetY, imageOpacity);
                }
                
                // Draw white overlay fading out
                if (whiteOpacity > 0) {
                    this._drawWhiteOverlay(whiteOpacity);
                }
            }
        }
    }

    /**
     * Draw white overlay inside the mask
     */
    _drawWhiteOverlay(opacity) {
        push();
        
        beginClip();
        this.rect.drawCurve(this.windowData.curveReader);
        endClip();
        
        let rectCenterX = this.rect.x + this.rect.w / 2;
        let rectCenterY = this.rect.y + this.rect.h / 2;
        
        translate(rectCenterX, rectCenterY);
        
        noStroke();
        fill(0, 0, 100, opacity);
        rectMode(CENTER);
        rect(0, 0, this.rect.w, this.rect.h);
        
        pop();
    }

    /**
     * Calculate random offset for an image (called once when image is set)
     */
    _calculateImageOffset(targetImage, drawScale, drawAngleDegree) {
        if (!targetImage) return { x: 0, y: 0 };

        let curveReader = this.windowData.curveReader;
        
        // Get original resolution from curve data
        let originalW = 100;
        let originalH = 100;

        if (curveReader.data && curveReader.data.resolution) {
            originalW = curveReader.data.resolution.width;
            originalH = curveReader.data.resolution.height;
        } else if (curveReader.data && curveReader.data.canvas) {
            originalW = curveReader.data.canvas.width;
            originalH = curveReader.data.canvas.height;
        }

        // Calculate mask bounds
        let maskMinX = Infinity, maskMaxX = -Infinity;
        let maskMinY = Infinity, maskMaxY = -Infinity;

        for (let point of curveReader.points) {
            let pos = point.position;
            if (pos.x < maskMinX) maskMinX = pos.x;
            if (pos.x > maskMaxX) maskMaxX = pos.x;
            if (pos.y < maskMinY) maskMinY = pos.y;
            if (pos.y > maskMaxY) maskMaxY = pos.y;
        }

        let maskW = maskMaxX - maskMinX;
        let maskH = maskMaxY - maskMinY;
        
        let pw = this.rect.w - this.rect.padding * 2;
        let ph = this.rect.h - this.rect.padding * 2;

        let rectToOriginalScaleX = pw / originalW;
        let rectToOriginalScaleY = ph / originalH;

        let maskWInRectSpace = maskW * rectToOriginalScaleX;
        let maskHInRectSpace = maskH * rectToOriginalScaleY;

        let angleRad = radians(drawAngleDegree);
        let cosA = Math.abs(Math.cos(angleRad));
        let sinA = Math.abs(Math.sin(angleRad));
        
        let rotatedBBoxW = maskWInRectSpace * cosA + maskHInRectSpace * sinA;
        let rotatedBBoxH = maskWInRectSpace * sinA + maskHInRectSpace * cosA;

        let targetAspect = rotatedBBoxW / rotatedBBoxH;
        let imgAspect = targetImage.width / targetImage.height;

        let coverScale;
        if (imgAspect > targetAspect) {
            coverScale = rotatedBBoxH / targetImage.height;
        } else {
            coverScale = rotatedBBoxW / targetImage.width;
        }

        let finalScale = coverScale * drawScale;
        let finalImgW = targetImage.width * finalScale;
        let finalImgH = targetImage.height * finalScale;

        // Calculate offset for randomization when scale < 1
        let offsetX = 0;
        let offsetY = 0;

        if (drawScale < 1.0) {
            let availableW = max(0, rotatedBBoxW - finalImgW);
            let availableH = max(0, rotatedBBoxH - finalImgH);

            // Calculate random offset ONCE
            offsetX = random(-availableW / 2, availableW / 2);
            offsetY = random(-availableH / 2, availableH / 2);
        }

        return { x: offsetX, y: offsetY };
    }

    /**
     * Internal method to draw image inside mask with opacity
     */
    _drawImageInsideMaskInternal(targetImage, drawScale, drawAngleDegree, preCalculatedOffsetX, preCalculatedOffsetY, opacity = 1.0) {

        if (!targetImage) return;

        let curveReader = this.windowData.curveReader;
        
        // Get original resolution from curve data
        let originalW = 100;
        let originalH = 100;

        if (curveReader.data && curveReader.data.resolution) {
            originalW = curveReader.data.resolution.width;
            originalH = curveReader.data.resolution.height;
        } else if (curveReader.data && curveReader.data.canvas) {
            originalW = curveReader.data.canvas.width;
            originalH = curveReader.data.canvas.height;
        }

        // Calculate mask bounds in original coordinates
        let maskMinX = Infinity, maskMaxX = -Infinity;
        let maskMinY = Infinity, maskMaxY = -Infinity;

        for (let point of curveReader.points) {
            let pos = point.position;
            if (pos.x < maskMinX) maskMinX = pos.x;
            if (pos.x > maskMaxX) maskMaxX = pos.x;
            if (pos.y < maskMinY) maskMinY = pos.y;
            if (pos.y > maskMaxY) maskMaxY = pos.y;
        }

        let maskW = maskMaxX - maskMinX;
        let maskH = maskMaxY - maskMinY;
        
        // Get rect dimensions with padding
        let px = this.rect.x + this.rect.padding;
        let py = this.rect.y + this.rect.padding;
        let pw = this.rect.w - this.rect.padding * 2;
        let ph = this.rect.h - this.rect.padding * 2;

        // Calculate rect center
        let rectCenterX = this.rect.x + this.rect.w / 2;
        let rectCenterY = this.rect.y + this.rect.h / 2;

        // Calculate scale needed to fit rect into original resolution space
        let rectToOriginalScaleX = pw / originalW;
        let rectToOriginalScaleY = ph / originalH;

        // Calculate mask dimensions in rect space
        let maskWInRectSpace = maskW * rectToOriginalScaleX;
        let maskHInRectSpace = maskH * rectToOriginalScaleY;

        // Calculate cover mode scale for the image
        // When drawScale = 1.0, the image should cover the rect completely even after rotation
        
        // To handle rotation, we need to find the bounding box of the rotated rect
        let angleRad = radians(drawAngleDegree);
        let cosA = Math.abs(Math.cos(angleRad));
        let sinA = Math.abs(Math.sin(angleRad));
        
        // Rotated bounding box dimensions
        let rotatedBBoxW = maskWInRectSpace * cosA + maskHInRectSpace * sinA;
        let rotatedBBoxH = maskWInRectSpace * sinA + maskHInRectSpace * cosA;

        // Calculate aspect ratios
        let targetAspect = rotatedBBoxW / rotatedBBoxH;
        let imgAspect = targetImage.width / targetImage.height;

        // Cover mode: scale so the image covers the rotated bounding box
        let coverScale;
        if (imgAspect > targetAspect) {
            // Image is wider, scale by height
            coverScale = rotatedBBoxH / targetImage.height;
        } else {
            // Image is taller or same, scale by width
            coverScale = rotatedBBoxW / targetImage.width;
        }

        // Apply user scale
        let finalScale = coverScale * drawScale;

        // Calculate final image dimensions
        let finalImgW = targetImage.width * finalScale;
        let finalImgH = targetImage.height * finalScale;

        // Use pre-calculated offset (passed as parameter)
        let offsetX = preCalculatedOffsetX;
        let offsetY = preCalculatedOffsetY;

        // Draw with clipping mask
        noStroke();
        fill(0, 0, 100);
        push();
        
        // Apply clipping mask
        beginClip();
        this.rect.drawCurve(curveReader);
        endClip();

        // Move to rect center
        translate(rectCenterX, rectCenterY);
        
        // Apply rotation
        rotate(angleRad);

        // Draw the image with opacity
        // Note: fade-in alpha is already applied by drawObject()
        // We multiply it with the transition opacity here
        imageMode(CENTER);
        tint(255, opacity * 255);
        image(targetImage, offsetX, offsetY, finalImgW, finalImgH);
        noTint();

        pop();
    }

    /**
     * Legacy method for direct drawing (kept for backward compatibility)
     * Use setInsideImage() + drawObject() for transition support
     */
    drawImageInsideMask(targetImage, drawScale = 1.0, drawAngleDegree = 0) {
        let offsets = this._calculateImageOffset(targetImage, drawScale, drawAngleDegree);
        this._drawImageInsideMaskInternal(targetImage, drawScale, drawAngleDegree, offsets.x, offsets.y, 1.0);
    }
}