import { Curve } from "./Curve.js";
import { Vector3 } from "./Vector3.js";

class CubicBezierCurve3 extends Curve {
    constructor(v0, v1, v2, v3) {
        super();
        this.type = "CubicBezierCurve3";
        this.v0 = v0 || new Vector3();
        this.v1 = v1 || new Vector3();
        this.v2 = v2 || new Vector3();
        this.v3 = v3 || new Vector3();
    }
    getPoint(t, optionalTarget) {
        var point = optionalTarget || new Vector3();
        var u = 1 - t, tt = t * t, uu = u * u, uuu = uu * u, ttt = tt * t;
        point.x = uuu * this.v0.x + 3 * uu * t * this.v1.x + 3 * u * tt * this.v2.x + ttt * this.v3.x;
        point.y = uuu * this.v0.y + 3 * uu * t * this.v1.y + 3 * u * tt * this.v2.y + ttt * this.v3.y;
        point.z = uuu * this.v0.z + 3 * uu * t * this.v1.z + 3 * u * tt * this.v2.z + ttt * this.v3.z;
        return point;
    }
}

export { CubicBezierCurve3 };
