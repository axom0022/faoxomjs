import { Curve } from "./Curve.js";
import { Vector3 } from "./Vector3.js";

class LineCurve3 extends Curve {
    constructor(v1, v2) { super(); this.type = "LineCurve3"; this.v1 = v1 || new Vector3(); this.v2 = v2 || new Vector3(); }
    getPoint(t, optionalTarget) {
        var point = optionalTarget || new Vector3();
        if (t === 1) point.copy(this.v2); else point.copy(this.v2).sub(this.v1).multiplyScalar(t).add(this.v1);
        return point;
    }
}

export { LineCurve3 };
