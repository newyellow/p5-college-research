class NYModel {
    static UV_CENTER = 0;
    static UV_TOP_DOWN = 1;

    constructor(_modelName) {

        this.edgePoints = [];

        this.verts = [];
        this.vertColors = [];
        this.triangles = [];
        this.uvs = [];
        this.vertIndex = 0;

        this.modelName = _modelName;

        this.customAttributeNames = [];
        this.customAttributeDatas = [];

        this.uvMode = NYModel.UV_TOP_DOWN;
    }

    static generatePointsForRoundedRect(_w, _h, _radius, _pointCount, _noiseScale = 0, _noiseOffset = 0) {
        let points = [];
        
        let halfW = _w / 2;
        let halfH = _h / 2;
        
        // Clamp radius
        let r = _radius;
        let maxR = min(_w, _h) / 2;
        if (r > maxR) r = maxR;
        if (r < 0) r = 0;

        // Segments
        let lineTopLen = _w - 2 * r;
        let arcTRLen = HALF_PI * r;
        let lineRightLen = _h - 2 * r;
        let arcBRLen = HALF_PI * r;
        let lineBottomLen = _w - 2 * r;
        let arcBLLen = HALF_PI * r;
        let lineLeftLen = _h - 2 * r;
        let arcTLLen = HALF_PI * r;

        let perimeter = lineTopLen + arcTRLen + lineRightLen + arcBRLen + lineBottomLen + arcBLLen + lineLeftLen + arcTLLen;
        
        let seedOffset = random(-1000.0, 1000.0);

        for(let i=0; i<_pointCount; i++) {
            let t = i / _pointCount; 
            let currentDist = t * perimeter;
            
            let px = 0;
            let py = 0;

            // Determine segment
            // Top Line
            if (currentDist < lineTopLen) {
                let localDist = currentDist;
                px = -halfW + r + localDist;
                py = -halfH;
            } else {
                currentDist -= lineTopLen;
                // TR Arc
                if (currentDist < arcTRLen) {
                    let angle = -HALF_PI + (currentDist / arcTRLen) * HALF_PI;
                    px = halfW - r + cos(angle) * r;
                    py = -halfH + r + sin(angle) * r;
                } else {
                    currentDist -= arcTRLen;
                    // Right Line
                    if (currentDist < lineRightLen) {
                        let localDist = currentDist;
                        px = halfW;
                        py = -halfH + r + localDist;
                    } else {
                        currentDist -= lineRightLen;
                        // BR Arc
                        if (currentDist < arcBRLen) {
                            let angle = 0 + (currentDist / arcBRLen) * HALF_PI;
                            px = halfW - r + cos(angle) * r;
                            py = halfH - r + sin(angle) * r;
                        } else {
                            currentDist -= arcBRLen;
                            // Bottom Line
                            if (currentDist < lineBottomLen) {
                                let localDist = currentDist;
                                px = halfW - r - localDist; // moving left
                                py = halfH;
                            } else {
                                currentDist -= lineBottomLen;
                                // BL Arc
                                if (currentDist < arcBLLen) {
                                    let angle = HALF_PI + (currentDist / arcBLLen) * HALF_PI;
                                    px = -halfW + r + cos(angle) * r;
                                    py = halfH - r + sin(angle) * r;
                                } else {
                                    currentDist -= arcBLLen;
                                    // Left Line
                                    if (currentDist < lineLeftLen) {
                                        let localDist = currentDist;
                                        px = -halfW;
                                        py = halfH - r - localDist; // moving up
                                    } else {
                                        currentDist -= lineLeftLen;
                                        // TL Arc
                                        let angle = PI + (currentDist / arcTLLen) * HALF_PI;
                                        px = -halfW + r + cos(angle) * r;
                                        py = -halfH + r + sin(angle) * r;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Apply Noise
            // Use _noiseScale for frequency (coordinate scaling)
            // Use _noiseOffset for amplitude (pixel displacement)
            let nx = (noise(px * _noiseScale, py * _noiseScale, seedOffset) - 0.5) * _noiseOffset * 2.0; 
            let ny = (noise(px * _noiseScale + 123.45, py * _noiseScale + 123.45, seedOffset) - 0.5) * _noiseOffset * 2.0;

            points.push(new NYPoint(px + nx, py + ny));
        }

        return points;
    }

    addRegularShape(_centerX, _centerY, _radius = 100, _edgeCount = 4, _initRotation = 0) {

        let minX = _centerX - _radius;
        let maxX = _centerX + _radius;
        let minY = _centerY - _radius;
        let maxY = _centerY + _radius;

        for (let i = 0; i < _edgeCount; i++) {
            let p1x = _centerX;
            let p1y = _centerY;

            let p2Angle = i / _edgeCount * 360.0;
            let p3Angle = ((i + 1) / _edgeCount) * 360.0;

            let p2x = _centerX + sin(radians(p2Angle)) * _radius;
            let p2y = _centerY + cos(radians(p2Angle)) * _radius;

            let p3x = _centerX + sin(radians(p3Angle)) * _radius;
            let p3y = _centerY + cos(radians(p3Angle)) * _radius;

            let uv1 = [0, 1];
            let uv2 = [1, 0];
            let uv3 = [1, 1];

            if (this.uvMode == NYModel.UV_CENTER) {
                uv1 = [0, 0];
                uv2 = [i / _edgeCount, 1];
                uv3 = [(i + 1) / _edgeCount, 1];
            }
            else if (this.uvMode == NYModel.UV_TOP_DOWN) {
                uv1 = [0.5, 0.5];
                uv2 = [inverseLerp(minX, maxX, p2x), inverseLerp(minY, maxY, p2y)];
                uv3 = [inverseLerp(minX, maxX, p3x), inverseLerp(minY, maxY, p3y)];
            }

            this.addTriangle(p1x, p1y, p2x, p2y, p3x, p3y, uv1, uv2, uv3);
        }
    }

    addTrianglesByEdgePoints(_points) {
        if (_points.length < 3) return;

        // keep a copy for later use
        this.edgePoints = _points;

        // Use the Delaunay helper to get triangles
        // The helper returns array of [p1, p2, p3] arrays
        // Note: This uses the helper class we just created
        let tris = NYTriangulation.triangulate(_points);

        for (let i = 0; i < tris.length; i++) {
            let t = tris[i];
            // t[0], t[1], t[2] are the points
            
            // Use the existing addTriangleByPoints method
            // We assume the points returned are the same objects as input,
            // so they retain their UV properties if they had them.
            this.addTriangleByPoints(t[0], t[1], t[2]);
        }
    }

    addTriangleByPoints(_p1, _p2, _p3)
    {
        this.verts.push([_p1.x, _p1.y]);
        this.verts.push([_p2.x, _p2.y]);
        this.verts.push([_p3.x, _p3.y]);

        this.vertColors.push([1.0, 1.0, 1.0, 1.0]);
        this.vertColors.push([1.0, 1.0, 1.0, 1.0]);
        this.vertColors.push([1.0, 1.0, 1.0, 1.0]);

        this.uvs.push([_p1.uvX, _p1.uvY]);
        this.uvs.push([_p2.uvX, _p2.uvY]);
        this.uvs.push([_p3.uvX, _p3.uvY]);

        this.triangles.push([this.vertIndex + 0, this.vertIndex + 1, this.vertIndex + 2]);
        this.vertIndex += 3;
    }

    addTriangle(_x1, _y1, _x2, _y2, _x3, _y3, _uv1 = [0, 1], _uv2 = [1, 0], _uv3 = [1, 1]) {
        this.verts.push([_x1, _y1]);
        this.verts.push([_x2, _y2]);
        this.verts.push([_x3, _y3]);

        this.vertColors.push([1.0, 1.0, 1.0, 1.0]);
        this.vertColors.push([1.0, 1.0, 1.0, 1.0]);
        this.vertColors.push([1.0, 1.0, 1.0, 1.0]);

        this.uvs.push(_uv1);
        this.uvs.push(_uv2);
        this.uvs.push(_uv3);

        this.triangles.push([this.vertIndex + 0, this.vertIndex + 1, this.vertIndex + 2]);
        this.vertIndex += 3;
    }

    generateOutlineModel(_inThickness = 0, _outThickness = 5) {
        if (!this.edgePoints || this.edgePoints.length < 3) return null;

        let pts = this.edgePoints;
        let count = pts.length;
        
        // 1. Calculate total length for UV normalization
        let totalLength = 0;
        let dists = [];
        for(let i = 0; i < count; i++) {
            let p1 = pts[i];
            let p2 = pts[(i + 1) % count];
            let d = dist(p1.x, p1.y, p2.x, p2.y);
            dists.push(d);
            totalLength += d;
        }

        // 2. Calculate Normals (Left Normal for CW points -> Points Outwards)
        let normals = [];
        for(let i = 0; i < count; i++) {
            let prev = pts[(i - 1 + count) % count];
            let curr = pts[i];
            let next = pts[(i + 1) % count];

            // Vector prev -> curr
            let v1x = curr.x - prev.x;
            let v1y = curr.y - prev.y;
            let len1 = sqrt(v1x*v1x + v1y*v1y);
            if (len1 > 0) { v1x /= len1; v1y /= len1; }
            
            // Left Normal: (y, -x)
            let n1x = v1y;
            let n1y = -v1x;

            // Vector curr -> next
            let v2x = next.x - curr.x;
            let v2y = next.y - curr.y;
            let len2 = sqrt(v2x*v2x + v2y*v2y);
            if (len2 > 0) { v2x /= len2; v2y /= len2; }
            
            let n2x = v2y;
            let n2y = -v2x;

            // Average Normal
            let nx = n1x + n2x;
            let ny = n1y + n2y;
            let nlen = sqrt(nx*nx + ny*ny);
            if (nlen > 0.0001) {
                nx /= nlen;
                ny /= nlen;
            } else {
                nx = n1x; ny = n1y; // Fallback
            }
            normals.push({x: nx, y: ny});
        }

        let outlineModel = new NYModel(this.modelName + "_outline");
        let currentDist = 0;
        
        // Store points for previous iteration
        let prevInner, prevEdge, prevOuter;

        // 3. Build Strips (loop count + 1 to close the loop)
        for(let i = 0; i <= count; i++) {
            let idx = i % count;
            let p = pts[idx];
            let n = normals[idx];
            
            // UV X: Progress along outline (0 to 1)
            let u = totalLength > 0 ? currentDist / totalLength : 0;
            
            // Vertices
            // Inner: Original Point - Normal * _inThickness (uvY = 0)
            // Edge: Original Point (uvY = 0.5)
            // Outer: Original Point + Normal * _outThickness (uvY = 1)
            
            let innerX = p.x - n.x * _inThickness;
            let innerY = p.y - n.y * _inThickness;
            
            let edgeX = p.x;
            let edgeY = p.y;

            let outerX = p.x + n.x * _outThickness;
            let outerY = p.y + n.y * _outThickness;

            let currInner = { x: innerX, y: innerY, uvX: u, uvY: 0.0 };
            let currEdge = { x: edgeX, y: edgeY, uvX: u, uvY: 0.5 };
            let currOuter = { x: outerX, y: outerY, uvX: u, uvY: 1.0 };

            if (i > 0) {
                // INNER STRIP (Thickness to Edge) -> uvY: 0.0 to 0.5
                // Quad between PrevInner, PrevEdge, CurrEdge, CurrInner
                
                // Tri 1: PrevInner -> PrevEdge -> CurrInner
                outlineModel.addTriangleByPoints(prevInner, prevEdge, currInner);
                // Tri 2: PrevEdge -> CurrEdge -> CurrInner
                outlineModel.addTriangleByPoints(prevEdge, currEdge, currInner);

                // OUTER STRIP (Edge to Outer) -> uvY: 0.5 to 1.0
                // Quad between PrevEdge, PrevOuter, CurrOuter, CurrEdge

                // Tri 3: PrevEdge -> PrevOuter -> CurrEdge
                outlineModel.addTriangleByPoints(prevEdge, prevOuter, currEdge);
                // Tri 4: PrevOuter -> CurrOuter -> CurrEdge
                outlineModel.addTriangleByPoints(prevOuter, currOuter, currEdge);
            }

            // Prepare for next iteration
            if (i < count) {
                currentDist += dists[idx];
            }
            prevInner = currInner;
            prevEdge = currEdge;
            prevOuter = currOuter;
        }

        return outlineModel;
    }

    /**
     * Generate a quad model that is based on the current points.
     * 
     * This will create a rectangular (quad) NYModel covering the AABB (axis-aligned bounding box)
     * of either this model's verts or edgePoints (if verts don't exist).
     * 
     * @returns {NYModel|null} The new quad model, or null if no points are available.
     */
    generateBoundsQuadModel () {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        let hasPoints = false;

        // Check vertices first
        if (this.verts.length > 0) {
            hasPoints = true;
            for (let i = 0; i < this.verts.length; i++) {
                let vx = this.verts[i][0];
                let vy = this.verts[i][1];
                if (vx < minX) minX = vx;
                if (vx > maxX) maxX = vx;
                if (vy < minY) minY = vy;
                if (vy > maxY) maxY = vy;
            }
        } 
        // If no verts, check edgePoints
        else if (this.edgePoints && this.edgePoints.length > 0) {
            hasPoints = true;
            for (let i = 0; i < this.edgePoints.length; i++) {
                let vx = this.edgePoints[i].x;
                let vy = this.edgePoints[i].y;
                if (vx < minX) minX = vx;
                if (vx > maxX) maxX = vx;
                if (vy < minY) minY = vy;
                if (vy > maxY) maxY = vy;
            }
        }

        if (!hasPoints) return null;

        let quadModel = new NYModel(this.modelName + "_quad");
        
        // Triangle 1: TL -> TR -> BL
        quadModel.addTriangle(
            minX, minY, 
            maxX, minY, 
            minX, maxY, 
            [0, 0], [1, 0], [0, 1]
        );

        // Triangle 2: TR -> BR -> BL
        quadModel.addTriangle(
            maxX, minY, 
            maxX, maxY, 
            minX, maxY, 
            [1, 0], [1, 1], [0, 1]
        );

        return quadModel;
    }

    static generateFullScreenQuadModel (_width, _height) {
        let quadModel = new NYModel("NYModel_fullscreen_quad");
        
        let halfW = _width / 2.0;
        let halfH = _height / 2.0;

        // Triangle 1: TL -> TR -> BL
        quadModel.addTriangle(
            -halfW, -halfH, 
             halfW, -halfH, 
            -halfW,  halfH, 
            [0, 0], [1, 0], [0, 1]
        );

        // Triangle 2: TR -> BR -> BL
        quadModel.addTriangle(
             halfW, -halfH, 
             halfW,  halfH, 
            -halfW,  halfH, 
            [1, 0], [1, 1], [0, 1]
        );

        return quadModel;
    }

    addCustomAttribute(_attributeName, _data) {

        // if attribute not exist yet, init attributes
        if (!this.customAttributeNames.includes(_attributeName)) {
            this.customAttributeNames.push(_attributeName);
            this.customAttributeDatas[_attributeName] = [];
        }

        // put in data
        for (let i = 0; i < _data.length; i++) {
            this.customAttributeDatas[_attributeName].push(_data[i]);
        }
    }

    normalizeTrianglesUV (_customAttributeName = null) {
        
        if (_customAttributeName != null) {
            let newData = [];
            for (let i = 0; i < this.verts.length; i += 3) {
                if (i + 2 >= this.verts.length) break;
                
                newData.push(0.0, 0.0);
                newData.push(1.0, 0.0);
                newData.push(0.5, 1.0);
            }
            this.addCustomAttribute(_customAttributeName, newData);
        }
        else {
            // Reassign UVs for each triangle individually to (0,0), (1,0), (0.5,1)
            // This maps the texture to each triangle, making them distinct
            for (let i = 0; i < this.uvs.length; i += 3) {
                // Ensure we have a full triangle
                if (i + 2 >= this.uvs.length) break;

                this.uvs[i] = [0.0, 0.0];
                this.uvs[i + 1] = [1.0, 0.0];
                this.uvs[i + 2] = [0.5, 1.0];
            }
        }
    }

    normalizeUV (_customAttributeName = null) {
        if (this.verts.length == 0) return;

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        // 1. Find bounding box of all vertices
        for (let i = 0; i < this.verts.length; i++) {
            let vx = this.verts[i][0];
            let vy = this.verts[i][1];

            if (vx < minX) minX = vx;
            if (vx > maxX) maxX = vx;
            if (vy < minY) minY = vy;
            if (vy > maxY) maxY = vy;
        }

        let rangeX = maxX - minX;
        let rangeY = maxY - minY;

        // Prevent division by zero
        if (rangeX === 0) rangeX = 1;
        if (rangeY === 0) rangeY = 1;

        // 2. Remap UVs based on vertex position within bounding box
        if (_customAttributeName != null) {
            let newData = [];
            for (let i = 0; i < this.verts.length; i++) {
                let vx = this.verts[i][0];
                let vy = this.verts[i][1];

                let u = (vx - minX) / rangeX;
                let v = (vy - minY) / rangeY;

                newData.push(u, v);
            }
            this.addCustomAttribute(_customAttributeName, newData);
        }
        else {
            this.uvs = [];
            for (let i = 0; i < this.verts.length; i++) {
                let vx = this.verts[i][0];
                let vy = this.verts[i][1];

                let u = (vx - minX) / rangeX;
                let v = (vy - minY) / rangeY;

                this.uvs.push([u, v]);
            }
        }
    }

    clear() {
        this.edgePoints = [];
        
        this.verts = [];
        this.vertColors = [];
        this.triangles = [];
        this.uvs = [];
        this.vertIndex = 0;

        this.customAttributeNames = [];
        this.customAttributeDatas = [];
    }

    build(_renderer = null) {

        if(_renderer == null)
            _renderer = p5.instance._renderer;
        
        let md = new p5.Geometry();
        md.gid = this.modelName;

        md.vertices = [];
        for (let i = 0; i < this.verts.length; i++)
            md.vertices.push(new p5.Vector(this.verts[i][0], this.verts[i][1], 0));

        md.faces = [];
        for (let i = 0; i < this.triangles.length; i++)
            md.faces.push(this.triangles[i]);

        // CRITICAL FIX: p5.js expects FLAT arrays for uvs and vertexColors
        // UVs: [u1, v1, u2, v2, ...] not [[u1, v1], [u2, v2], ...]
        // Colors: [r1, g1, b1, a1, r2, g2, b2, a2, ...] not [[r1, g1, b1, a1], ...]
        md.uvs = [];
        for (let i = 0; i < this.uvs.length; i++)
            md.uvs.push(this.uvs[i][0], this.uvs[i][1]);

        md.vertexColors = [];
        for (let i = 0; i < this.vertColors.length; i++)
            md.vertexColors.push(this.vertColors[i][0], this.vertColors[i][1], this.vertColors[i][2], this.vertColors[i][3]);

        if (this.customAttributeNames.length > 0) {
            if (_renderer == null) {
                console.error("Need renderer reference for custom attributes");
                return;
            }

            for (let i = 0; i < this.customAttributeNames.length; i++) {

                let attributeName = this.customAttributeNames[i];
                let data = this.customAttributeDatas[attributeName];
                let dataCountPerVertex = int(data.length / this.verts.length);

                if (data.length % this.verts.length != 0) {
                    console.error(`WARNING: custom attribute ${attributeName} data count [${data.length}] not match vertices count [${this.verts.length}]`);
                    return;
                }

                // Use p5.js Geometry API to set custom vertex attribute
                md.vertexProperty(attributeName, data, dataCountPerVertex);
            }
        }
        return md;
    }
}

class NYPoint {
    constructor(_x, _y, _uvX = 0, _uvY = 0) {
        this.x = _x;
        this.y = _y;
        this.uvX = _uvX;
        this.uvY = _uvY;
    }

    randomOffset(_rangeX = 20, _rangeY = null) {
        if(_rangeY == null)
            _rangeY = _rangeX;

        this.x += random(-_rangeX, _rangeX);
        this.y += random(-_rangeY, _rangeY);

        return this;
    }
}