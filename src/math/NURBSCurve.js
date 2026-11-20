import { Curve } from "./Curve.js";

import { NURBSUtils } from "./NURBSUtils.js";

import { Vector3 } from "./Vector3.js";

class NURBSCurve extends Curve {
    constructor(zaoha, zaohb, zaohc, zaohd, zaohe) {
        super();
        this.type = "NURBSCurve";
        this.degree = zaoha || 3;
        this.knots = zaohb || [];
        this.controlPoints = zaohc || [];
        this.startKnot = zaohd !== undefined ? zaohd : this.knots[this.degree] || 0;
        this.endKnot = zaohe !== undefined ? zaohe : this.knots[this.knots.length - 1 - this.degree] || 1;
    }
    getPoint(zaoha, zaohb) {
        var zaohc = zaohb || new Vector3;
        var zaohd = this.startKnot + (this.endKnot - this.startKnot) * zaoha;
        var zaohe = NURBSUtils.calcBSplinePoint(this.degree, this.knots, this.controlPoints, zaohd);
        var zaohf = zaohe.w || 1;
        zaohc.set(zaohe.x / zaohf, zaohe.y / zaohf, zaohe.z / zaohf);
        return zaohc;
    }
}

export { NURBSCurve };
