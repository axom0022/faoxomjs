import { BufferAttribute } from "../core/index.js";

import { Geometry } from "../geometries/index.js";

import { BasicMaterial } from "../materials/index.js";

import { Line } from "../objects/index.js";

class CameraHelper extends Line {
    constructor(zalaa) {
        var zalab = new Geometry;
        var zalac = [ 0, 0, 0, -1, 1, -1, 0, 0, 0, 1, 1, -1, 0, 0, 0, 1, -1, -1, 0, 0, 0, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, 1, -1, 1, -1, -1, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 1, -1, -1, 1, -1, -2, 2, -2, 1, 1, -1, 2, 2, -2, 1, -1, -1, 2, -2, -2, -1, -1, -1, -2, -2, -2, -2, 2, -2, 2, 2, -2, 2, 2, -2, 2, -2, -2, 2, -2, -2, -2, -2, -2, -2, -2, -2, -2, 2, -2 ];
        zalab.attributes.position = new BufferAttribute(new Float32Array(zalac), 3);
        super(zalab, new BasicMaterial({
            color: 16755200
        }));
        this.type = "CameraHelper";
        this.camera = zalaa;
    }
    update() {
        if (this.camera) this.matrix.copy(this.camera.matrixWorld);
    }
}

export { CameraHelper };
