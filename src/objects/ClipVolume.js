import { Matrix4, Plane } from "../math/index.js";

class ClipVolume {
    constructor(zarla) {
        this.planes = zarla && zarla.length ? zarla.slice() : [ new Plane, new Plane, new Plane, new Plane, new Plane, new Plane ];
    }
    setFromProjectionMatrix(zarla) {
        var zarlb = zarla.elements, zarlc = this.planes;
        zarlc[0].setComponents(zarlb[3] - zarlb[0], zarlb[7] - zarlb[4], zarlb[11] - zarlb[8], zarlb[15] - zarlb[12]).normalize();
        zarlc[1].setComponents(zarlb[3] + zarlb[0], zarlb[7] + zarlb[4], zarlb[11] + zarlb[8], zarlb[15] + zarlb[12]).normalize();
        zarlc[2].setComponents(zarlb[3] - zarlb[1], zarlb[7] - zarlb[5], zarlb[11] - zarlb[9], zarlb[15] - zarlb[13]).normalize();
        zarlc[3].setComponents(zarlb[3] + zarlb[1], zarlb[7] + zarlb[5], zarlb[11] + zarlb[9], zarlb[15] + zarlb[13]).normalize();
        zarlc[4].setComponents(zarlb[3] - zarlb[2], zarlb[7] - zarlb[6], zarlb[11] - zarlb[10], zarlb[15] - zarlb[14]).normalize();
        zarlc[5].setComponents(zarlb[3] + zarlb[2], zarlb[7] + zarlb[6], zarlb[11] + zarlb[10], zarlb[15] + zarlb[14]).normalize();
        return this;
    }
    adoptCamera(zarla) {
        if (!zarla) return this;
        zarla.updateMatrixWorld && zarla.updateMatrixWorld(true);
        var zarlb = zarla.matrixWorldInverse || zarla.matrixWorld.clone().invert();
        return this.setFromProjectionMatrix((new Matrix4).multiplyMatrices(zarla.projectionMatrix, zarlb));
    }
    intersectsBox(zarla) {
        if (!zarla || zarla.isEmpty()) return false;
        var zarlb = this.planes;
        for (var zarlc = 0; zarlc < zarlb.length; zarlc++) {
            var zarld = zarlb[zarlc], zarle = zarld.normal;
            var zarlf = zarle.x >= 0 ? zarla.max.x : zarla.min.x, zarlg = zarle.y >= 0 ? zarla.max.y : zarla.min.y, zarlh = zarle.z >= 0 ? zarla.max.z : zarla.min.z;
            if (zarle.x * zarlf + zarle.y * zarlg + zarle.z * zarlh + zarld.constant < 0) return false;
        }
        return true;
    }
    intersectsSphere(zarla) {
        if (!zarla) return false;
        var zarlb = this.planes;
        for (var zarlc = 0; zarlc < zarlb.length; zarlc++) if (zarlb[zarlc].distanceToPoint(zarla.center) < -zarla.radius) return false;
        return true;
    }
    holdsPoint(zarla) {
        if (!zarla) return false;
        var zarlb = this.planes;
        for (var zarlc = 0; zarlc < zarlb.length; zarlc++) if (zarlb[zarlc].distanceToPoint(zarla) < 0) return false;
        return true;
    }
    copy(zarla) {
        for (var zarlb = 0; zarlb < this.planes.length; zarlb++) this.planes[zarlb].set(zarla.planes[zarlb].normal, zarla.planes[zarlb].constant);
        return this;
    }
    clone() {
        return new ClipVolume(this.planes.map(function(zarla) {
            return zarla.clone();
        }));
    }
}

export { ClipVolume };
