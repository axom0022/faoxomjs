import { Vector3 } from "./Vector3.js";

class Tri3 {
    constructor(a, b, c) { this.a = a || new Vector3(); this.b = b || new Vector3(); this.c = c || new Vector3(); }
    set(a, b, c) { this.a.copy(a); this.b.copy(b); this.c.copy(c); return this; }
    copy(triangle) { this.a.copy(triangle.a); this.b.copy(triangle.b); this.c.copy(triangle.c); return this; }
    clone() { return new this.constructor(this.a.clone(), this.b.clone(), this.c.clone()); }
    area() { var ab = new Vector3().subVectors(this.b, this.a), ac = new Vector3().subVectors(this.c, this.a); return ab.cross(ac).length() * 0.5; }
    normal(target) { var t = target || new Vector3(); var ab = new Vector3().subVectors(this.b, this.a), ac = new Vector3().subVectors(this.c, this.a); t.crossVectors(ab, ac); return t.lengthSq() === 0 ? t.set(0, 0, 1) : t.normalize(); }
    midpoint(target) { return (target || new Vector3()).addVectors(this.a, this.b).add(this.c).multiplyScalar(1 / 3); }
    closestPointToPoint(point, target) {
        var t = target || new Vector3();
        var ab = new Vector3().subVectors(this.b, this.a), ac = new Vector3().subVectors(this.c, this.a), ap = new Vector3().subVectors(point, this.a);
        var d1 = ab.dot(ap), d2 = ac.dot(ap);
        if (this.a.distanceToSquared(this.b) === 0) return t.copy(this.a);
        if (d1 <= 0 && d2 <= 0) return t.copy(this.a);
        var bp = new Vector3().subVectors(point, this.b);
        var d3 = ab.dot(bp), d4 = ac.dot(bp);
        if (d3 >= 0 && d4 <= d3) return t.copy(this.b);
        var vc = d1 * d4 - d3 * d2;
        if (vc <= 0 && d1 >= 0 && d3 <= 0) { var v1 = d1 / (d1 - d3); return t.copy(this.a).addScaledVector(ab, v1); }
        var cp = new Vector3().subVectors(point, this.c);
        var d5 = ab.dot(cp), d6 = ac.dot(cp);
        if (d6 >= 0 && d5 <= d6) return t.copy(this.c);
        var vb = d5 * d2 - d1 * d6;
        if (vb <= 0 && d2 >= 0 && d6 <= 0) { var w1 = d2 / (d2 - d6); return t.copy(this.a).addScaledVector(ac, w1); }
        var va = d3 * d6 - d5 * d4;
        if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { var w2 = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return t.copy(this.b).addScaledVector(new Vector3().subVectors(this.c, this.b), w2); }
        var denominator = 1 / (va + vb + vc);
        var v = vb * denominator, w = vc * denominator;
        return t.copy(this.a).addScaledVector(ab, v).addScaledVector(ac, w);
    }
    distanceToPoint(point) { return this.closestPointToPoint(point, new Vector3()).distanceTo(point); }
    containsPoint(point) {
        var sign = function(pa, pb, pc) { var cross = new Vector3().subVectors(pb, pa).cross(new Vector3().subVectors(pc, pa)); return cross.x + cross.y + cross.z; };
        var d1 = sign(this.a, this.b, point), d2 = sign(this.b, this.c, point), d3 = sign(this.c, this.a, point);
        var hasNegative = d1 < 0 || d2 < 0 || d3 < 0, hasPositive = d1 > 0 || d2 > 0 || d3 > 0;
        return !(hasNegative && hasPositive);
    }
}

export { Tri3 };
