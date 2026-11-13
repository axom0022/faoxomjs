import { Vector3 } from "./Vector3.js";

class Ray {
    constructor(origin, direction) { this.origin = origin ? origin.clone() : new Vector3(); this.direction = direction ? direction.clone().normalize() : new Vector3(0, 0, -1); }
    set(origin, direction) { this.origin.copy(origin); this.direction.copy(direction).normalize(); return this; }
    clone() { return new Ray(this.origin, this.direction); }
    at(t, target) { return (target || new Vector3()).copy(this.direction).multiplyScalar(t).add(this.origin); }
    lookAt(v) { this.direction.copy(v).sub(this.origin).normalize(); return this; }
    recast(t) { this.origin.copy(this.at(t, new Vector3())); return this; }
    distanceToPoint(point) { var directionDistance = this.direction.dot(new Vector3().subVectors(point, this.origin)); var v = this.at(directionDistance, new Vector3()); return v.distanceTo(point); }
    intersectSphere(sphere, target) { if (!sphere || !(sphere.radius > 0)) return undefined; var v1 = new Vector3().subVectors(sphere.center, this.origin); var tca = v1.dot(this.direction); var d2 = v1.dot(v1) - tca * tca; var radius2 = sphere.radius * sphere.radius; if (d2 > radius2) return undefined; var thc = Math.sqrt(Math.max(0, radius2 - d2)); var t0 = tca - thc; var t1 = tca + thc; if (t1 < 0) return undefined; return this.at(t0 < 0 ? t1 : t0, target || new Vector3()); }
    intersectBox(box, target) { var tmin = 0; var tmax = Infinity; var axes = ["x", "y", "z"]; for (var i = 0; i < 3; i++) { var axis = axes[i]; var direction = this.direction[axis]; var origin = this.origin[axis]; if (Math.abs(direction) < 1e-12) { if (origin < box.min[axis] || origin > box.max[axis]) return undefined; continue; } var a = (box.min[axis] - origin) / direction; var b = (box.max[axis] - origin) / direction; if (a > b) { var swap = a; a = b; b = swap; } tmin = Math.max(tmin, a); tmax = Math.min(tmax, b); if (tmin > tmax) return undefined; } if (tmax < 0) return undefined; return this.at(tmin >= 0 ? tmin : tmax, target || new Vector3()); }
    intersectTriangle(a, b, c, backfaceCulling, target) { var edge1 = new Vector3().subVectors(b, a); var edge2 = new Vector3().subVectors(c, a); var pvec = new Vector3().crossVectors(this.direction, edge2); var det = edge1.dot(pvec); var epsilon = 1e-8; if (backfaceCulling ? det <= epsilon : Math.abs(det) <= epsilon) return undefined; var invdet = 1 / det; var tvec = new Vector3().subVectors(this.origin, a); var u = tvec.dot(pvec) * invdet; if (u < 0 || u > 1) return undefined; var qvec = new Vector3().crossVectors(tvec, edge1); var v = this.direction.dot(qvec) * invdet; if (v < 0 || u + v > 1) return undefined; var t = edge2.dot(qvec) * invdet; if (t < 0) return undefined; return this.at(t, target || new Vector3()); }
    intersectTriangleSealed(a, b, c, backfaceCulling, target) {
        var o = this.origin, d = this.direction;
        var ox = o.x, oy = o.y, oz = o.z, dx = d.x, dy = d.y, dz = d.z;
        var ax = a.x, ay = a.y, az = a.z, bx = b.x, by = b.y, bz = b.z, cx = c.x, cy = c.y, cz = c.z;
        var adx = Math.abs(dx), ady = Math.abs(dy), adz = Math.abs(dz);
        var kz, kx, ky;
        if (adx < ady) { if (ady < adz) { kz = 2; kx = 0; ky = 1; } else { kz = 1; kx = 2; ky = 0; } }
        else if (adx < adz) { kz = 2; kx = 0; ky = 1; }
        else { kz = 0; kx = 1; ky = 2; }
        var dzc = kz === 0 ? dx : kz === 1 ? dy : dz;
        if (dzc === 0) return undefined;
        if (dzc < 0) { var swapAxes = kx; kx = ky; ky = swapAxes; }
        var ac = [ax - ox, ay - oy, az - oz], bc = [bx - ox, by - oy, bz - oz], cc = [cx - ox, cy - oy, cz - oz];
        var dxc = kx === 0 ? dx : kx === 1 ? dy : dz;
        var dyc = ky === 0 ? dx : ky === 1 ? dy : dz;
        var sx = dxc / dzc, sy = dyc / dzc, sz = 1 / dzc;
        var axp = ac[kx] - sx * ac[kz], ayp = ac[ky] - sy * ac[kz];
        var bxp = bc[kx] - sx * bc[kz], byp = bc[ky] - sy * bc[kz];
        var cxp = cc[kx] - sx * cc[kz], cyp = cc[ky] - sy * cc[kz];
        var u = cxp * byp - cyp * bxp;
        var v = axp * cyp - ayp * cxp;
        var w = bxp * ayp - byp * axp;
        if ((u < 0 || v < 0 || w < 0) && (u > 0 || v > 0 || w > 0)) return undefined;
        var det = u + v + w;
        if (det === 0) return undefined;
        if (backfaceCulling && det < 0) return undefined;
        var t = sz * (u * ac[kz] + v * bc[kz] + w * cc[kz]) / det;
        if (t < 0 || !isFinite(t)) return undefined;
        var hit = target || new Vector3();
        hit.set(ox + t * dx, oy + t * dy, oz + t * dz);
        return hit;
    }
}

export { Ray };
