import { Curve } from "./Curve.js";

import { Vector3 } from "./Vector3.js";

class LineCurve3 extends Curve {
    constructor(zaoea, zaoeb) {
        super();
        this.type = "LineCurve3";
        this.v1 = zaoea || new Vector3;
        this.v2 = zaoeb || new Vector3;
    }
    getPoint(zaoea, zaoeb) {
        var zaoec = zaoeb || new Vector3;
        if (zaoea === 1) zaoec.copy(this.v2); else zaoec.copy(this.v2).sub(this.v1).multiplyScalar(zaoea).add(this.v1);
        return zaoec;
    }
}

export { LineCurve3 };
