import { Curve } from "./Curve.js";
import { Vector3 } from "./Vector3.js";

class CatmullRomCurve3 extends Curve {
    constructor(points, closed, curveType, tension) {
        super();
        this.type = "CatmullRomCurve3";
        this.points = points || [];
        this.closed = !!closed;
        this.curveType = curveType || "centripetal";
        this.tension = tension !== undefined ? tension : 0.5;
    }
    getPoint(t, optionalTarget) {
        var point = optionalTarget || new Vector3();
        var points = this.points, l = points.length;
        if (l < 2) return point;
        var p = (l - (this.closed ? 0 : 1)) * t;
        var intPoint = Math.floor(p), weight = p - intPoint;
        if (this.closed) intPoint += intPoint > 0 ? 0 : (Math.floor(Math.abs(intPoint) / l) + 1) * l;
        else if (weight === 0 && intPoint === l - 1) { intPoint = l - 2; weight = 1; }
        var p0, p1, p2, p3;
        if (this.closed || intPoint > 0) p0 = points[(intPoint - 1) % l]; else p0 = points[0].clone().sub(points[1].clone().sub(points[0]));
        p1 = points[intPoint % l];
        p2 = points[(intPoint + 1) % l];
        if (this.closed || intPoint + 2 < l) p3 = points[(intPoint + 2) % l]; else p3 = points[l - 1].clone().add(points[l - 1].clone().sub(points[l - 2]));
        var alpha = this.curveType === "chordal" ? 1.0 : this.curveType === "uniform" ? 0.0 : 0.5;
        var dt0 = Math.pow(p0.distanceToSquared(p1), alpha * 0.5);
        var dt1 = Math.pow(p1.distanceToSquared(p2), alpha * 0.5);
        var dt2 = Math.pow(p2.distanceToSquared(p3), alpha * 0.5);
        if (dt1 < 0.0001) dt1 = 1.0; if (dt0 < 0.0001) dt0 = dt1; if (dt2 < 0.0001) dt2 = dt1;
        var t1 = (p1.clone().sub(p0).multiplyScalar(1 / dt0).sub(p2.clone().sub(p0).multiplyScalar(1 / (dt0 + dt1))).add(p2.clone().sub(p1).multiplyScalar(1 / dt1))).multiplyScalar(dt1);
        var t2 = (p2.clone().sub(p1).multiplyScalar(1 / dt1).sub(p3.clone().sub(p1).multiplyScalar(1 / (dt1 + dt2))).add(p3.clone().sub(p2).multiplyScalar(1 / dt2))).multiplyScalar(dt1);
        var w2 = weight * weight, w3 = w2 * weight;
        var h00 = 2 * w3 - 3 * w2 + 1, h10 = w3 - 2 * w2 + weight, h01 = -2 * w3 + 3 * w2, h11 = w3 - w2;
        point.set(
            h00 * p1.x + h10 * t1.x + h01 * p2.x + h11 * t2.x,
            h00 * p1.y + h10 * t1.y + h01 * p2.y + h11 * t2.y,
            h00 * p1.z + h10 * t1.z + h01 * p2.z + h11 * t2.z
        );
        return point;
    }
}

export { CatmullRomCurve3 };
