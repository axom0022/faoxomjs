import { BufferAttribute } from "../core/index.js";
import { Geometry } from "../geometries/index.js";
import { BasicMaterial } from "../materials/index.js";
import { Line } from "../objects/index.js";

class CameraHelper extends Line {
    constructor(camera) {
        var geom = new Geometry();
        var p = [
            0,0,0, -1,1,-1, 0,0,0, 1,1,-1, 0,0,0, 1,-1,-1, 0,0,0, -1,-1,-1,
            -1,1,-1, 1,1,-1, 1,1,-1, 1,-1,-1, 1,-1,-1, -1,-1,-1, -1,-1,-1, -1,1,-1,
            -1,1,-1, -2,2,-2, 1,1,-1, 2,2,-2, 1,-1,-1, 2,-2,-2, -1,-1,-1, -2,-2,-2,
            -2,2,-2, 2,2,-2, 2,2,-2, 2,-2,-2, 2,-2,-2, -2,-2,-2, -2,-2,-2, -2,2,-2
        ];
        geom.attributes.position = new BufferAttribute(new Float32Array(p), 3);
        super(geom, new BasicMaterial({ color: 0xffaa00 }));
        this.type = "CameraHelper";
        this.camera = camera;
    }
    update() { if (this.camera) this.matrix.copy(this.camera.matrixWorld); }
}

export { CameraHelper };
