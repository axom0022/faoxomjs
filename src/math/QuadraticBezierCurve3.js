import { Curve } from "./Curve.js";
import { Vector3 } from "./Vector3.js";

class QuadraticBezierCurve3 extends Curve {
    constructor(v0, v1, v2) {
        super();
        this.type = "QuadraticBezierCurve3";
        this.v0 = v0 || new Vector3();
        this.v1 = v1 || new Vector3();
        this.v2 = v2 || new Vector3();
    }
    getPoint(t, optionalTarget) {
        var point = optionalTarget || new Vector3();
        var u = 1 - t;
        point.x = u * u * this.v0.x + 2 * u * t * this.v1.x + t * t * this.v2.x;
        point.y = u * u * this.v0.y + 2 * u * t * this.v1.y + t * t * this.v2.y;
        point.z = u * u * this.v0.z + 2 * u * t * this.v1.z + t * t * this.v2.z;
        return point;
    }
}

export { QuadraticBezierCurve3 };
