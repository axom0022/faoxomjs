import { Vector3, faoxomvalue } from "../math/index.js";

import { Geometry } from "./Geometry.js";

class WideLineGeometry extends Geometry {
    constructor(zakxa, zakxb) {
        super();
        this.setPoints(zakxa || [], zakxb);
    }
    setPoints(zakxa, zakxb) {
        zakxb = faoxomvalue(zakxb, .05);
        var zakxc = [];
        var zakxd = [];
        var zakxe = [];
        for (var zakxf = 0; zakxf < zakxa.length - 1; zakxf++) {
            var zakxg = zakxa[zakxf];
            var zakxh = zakxa[zakxf + 1];
            var zakxi = (new Vector3).subVectors(zakxh, zakxg).normalize();
            var zakxj = (new Vector3).crossVectors(zakxi, new Vector3(0, 1, 0));
            if (zakxj.lengthSq() < 1e-8) zakxj.crossVectors(zakxi, new Vector3(1, 0, 0));
            zakxj.normalize().multiplyScalar(zakxb * .5);
            var zakxk = zakxc.length / 3;
            zakxc.push(zakxg.x + zakxj.x, zakxg.y + zakxj.y, zakxg.z + zakxj.z, zakxg.x - zakxj.x, zakxg.y - zakxj.y, zakxg.z - zakxj.z, zakxh.x + zakxj.x, zakxh.y + zakxj.y, zakxh.z + zakxj.z, zakxh.x - zakxj.x, zakxh.y - zakxj.y, zakxh.z - zakxj.z);
            zakxe.push(0, 0, 0, 1, 1, 0, 1, 1);
            zakxd.push(zakxk, zakxk + 1, zakxk + 2, zakxk + 2, zakxk + 1, zakxk + 3);
        }
        this.attributes = {};
        this.setAttribute("position", new Float32Array(zakxc), 3);
        this.setAttribute("uv", new Float32Array(zakxe), 2);
        this.setIndex(zakxd.length > 65535 ? new Uint32Array(zakxd) : new Uint16Array(zakxd));
        this.computeVertexNormals();
        this.computeBounds();
        return this;
    }
}

export { WideLineGeometry };
