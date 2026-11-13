import { Matrix4, Plane } from "../math/index.js";

class ClipVolume {
    constructor(planes) { this.planes = planes && planes.length ? planes.slice() : [new Plane(), new Plane(), new Plane(), new Plane(), new Plane(), new Plane()]; }
    setFromProjectionMatrix(matrix) {
        var e = matrix.elements, p = this.planes;
        p[0].setComponents(e[3] - e[0], e[7] - e[4], e[11] - e[8], e[15] - e[12]).normalize();
        p[1].setComponents(e[3] + e[0], e[7] + e[4], e[11] + e[8], e[15] + e[12]).normalize();
        p[2].setComponents(e[3] - e[1], e[7] - e[5], e[11] - e[9], e[15] - e[13]).normalize();
        p[3].setComponents(e[3] + e[1], e[7] + e[5], e[11] + e[9], e[15] + e[13]).normalize();
        p[4].setComponents(e[3] - e[2], e[7] - e[6], e[11] - e[10], e[15] - e[14]).normalize();
        p[5].setComponents(e[3] + e[2], e[7] + e[6], e[11] + e[10], e[15] + e[14]).normalize();
        return this;
    }
    adoptCamera(camera) {
        if (!camera) return this;
        camera.updateMatrixWorld && camera.updateMatrixWorld(true);
        var view = camera.matrixWorldInverse || camera.matrixWorld.clone().invert();
        return this.setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, view));
    }
    intersectsBox(box) {
        if (!box || box.isEmpty()) return false;
        var p = this.planes;
        for (var i = 0; i < p.length; i++) {
            var plane = p[i], n = plane.normal;
            var px = n.x >= 0 ? box.max.x : box.min.x, py = n.y >= 0 ? box.max.y : box.min.y, pz = n.z >= 0 ? box.max.z : box.min.z;
            if (n.x * px + n.y * py + n.z * pz + plane.constant < 0) return false;
        }
        return true;
    }
    intersectsSphere(sphere) {
        if (!sphere) return false;
        var p = this.planes;
        for (var i = 0; i < p.length; i++) if (p[i].distanceToPoint(sphere.center) < -sphere.radius) return false;
        return true;
    }
    holdsPoint(point) {
        if (!point) return false;
        var p = this.planes;
        for (var i = 0; i < p.length; i++) if (p[i].distanceToPoint(point) < 0) return false;
        return true;
    }
    copy(volume) {
        for (var i = 0; i < this.planes.length; i++) this.planes[i].set(volume.planes[i].normal, volume.planes[i].constant);
        return this;
    }
    clone() { return new ClipVolume(this.planes.map(function(plane) { return plane.clone(); })); }
}

export { ClipVolume };
