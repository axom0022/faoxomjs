import { Curve } from "./Curve.js";

import { Vector3 } from "./Vector3.js";

class QuadraticBezierCurve3 extends Curve {
    constructor(zaoma, zaomb, zaomc) {
        super();
        this.type = "QuadraticBezierCurve3";
        this.v0 = zaoma || new Vector3;
        this.v1 = zaomb || new Vector3;
        this.v2 = zaomc || new Vector3;
    }
    getPoint(zaoma, zaomb) {
        var zaomc = zaomb || new Vector3;
        var zaomd = 1 - zaoma;
        zaomc.x = zaomd * zaomd * this.v0.x + 2 * zaomd * zaoma * this.v1.x + zaoma * zaoma * this.v2.x;
        zaomc.y = zaomd * zaomd * this.v0.y + 2 * zaomd * zaoma * this.v1.y + zaoma * zaoma * this.v2.y;
        zaomc.z = zaomd * zaomd * this.v0.z + 2 * zaomd * zaoma * this.v1.z + zaoma * zaoma * this.v2.z;
        return zaomc;
    }
}

export { QuadraticBezierCurve3 };
