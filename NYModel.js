class NYModel {
    static UV_CENTER = 0;
    static UV_TOP_DOWN = 1;

    constructor(_modelName) {
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

    build(_renderer = null) {
        let md = new p5.Geometry();
        md.gid = this.modelName;

        md.vertices = [];
        for (let i = 0; i < this.verts.length; i++)
            md.vertices.push(new p5.Vector(this.verts[i][0], this.verts[i][1], 0));

        md.faces = [];
        for (let i = 0; i < this.triangles.length; i++)
            md.faces.push(this.triangles[i]);

        md.uvs = [];
        for (let i = 0; i < this.uvs.length; i++)
            md.uvs.push(this.uvs[i]);

        md.vertexColors = [];
        for (let i = 0; i < this.vertColors.length; i++)
            md.vertexColors.push(this.vertColors[i]);

        if (this.customAttributeNames.length > 0) {
            if (_renderer == null) {
                console.error("Need renderer reference for custom attributes");
                return;
            }

            for (let i = 0; i < this.customAttributeNames.length; i++) {

                let attributeName = this.customAttributeNames[i];
                let customDataName = "custom_" + attributeName;
                let customBufferName = customDataName + "Buffer";

                let data = this.customAttributeDatas[attributeName];
                let dataCountPerVertex = int(data.length / this.verts.length);

                if (data.length % this.verts.length != 0) {
                    console.error(`WARNING: custom attribute ${attributeName} data count [${data.length}] not match vertices count [${this.verts.length}]`);
                    return;
                }

                // put in custom data
                md[customDataName] = [];
                for (let d = 0; d < data.length; d++)
                    md[customDataName].push(data[d]);

                console.log(`names: ${customDataName}  ${customBufferName}  ${attributeName}`);
                _renderer.retainedMode.buffers.fill.push(
                    new p5.RenderBuffer(
                        dataCountPerVertex, // number of components per vertex
                        customDataName, // src
                        customBufferName, // dst
                        attributeName, // attribute name
                        _renderer // renderer
                    )
                );
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
}