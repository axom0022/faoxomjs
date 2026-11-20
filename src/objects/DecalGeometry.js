import { Geometry } from "../geometries/index.js";

import { Vector3 } from "../math/index.js";

class DecalGeometry extends Geometry {
    constructor(zarna, zarnb, zarnc) {
        super();
        zarna = zarna || new Vector3;
        zarnb = (zarnb || new Vector3(0, 1, 0)).clone().normalize();
        zarnc = zarnc || new Vector3(1, 1, 1);
        var zarnd = Math.abs(zarnb.y) < .9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
        var zarne = (new Vector3).crossVectors(zarnd, zarnb).normalize().multiplyScalar(zarnc.x * .5);
        var zarnf = (new Vector3).crossVectors(zarnb, zarne).normalize().multiplyScalar(zarnc.y * .5);
        var zarng = zarna.clone().addScaledVector(zarnb, .001);
        var zarnh = [ zarng.clone().sub(zarne).sub(zarnf), zarng.clone().add(zarne).sub(zarnf), zarng.clone().add(zarne).add(zarnf), zarng.clone().sub(zarne).add(zarnf) ];
        this.setAttribute("position", new Float32Array([ zarnh[0].x, zarnh[0].y, zarnh[0].z, zarnh[1].x, zarnh[1].y, zarnh[1].z, zarnh[2].x, zarnh[2].y, zarnh[2].z, zarnh[3].x, zarnh[3].y, zarnh[3].z ]), 3);
        this.setAttribute("normal", new Float32Array([ zarnb.x, zarnb.y, zarnb.z, zarnb.x, zarnb.y, zarnb.z, zarnb.x, zarnb.y, zarnb.z, zarnb.x, zarnb.y, zarnb.z ]), 3);
        this.setAttribute("uv", new Float32Array([ 0, 0, 1, 0, 1, 1, 0, 1 ]), 2);
        this.setIndex(new Uint16Array([ 0, 1, 2, 0, 2, 3 ]));
        this.computeBounds();
    }
}

export { DecalGeometry };
