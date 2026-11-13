import { Curve } from "./Curve.js";
import { NURBSUtils } from "./NURBSUtils.js";
import { Vector3 } from "./Vector3.js";

class NURBSCurve extends Curve {
    constructor(degree, knots, controlPoints, startKnot, endKnot) {
        super();
        this.type = "NURBSCurve";
        this.degree = degree || 3;
        this.knots = knots || [];
        this.controlPoints = controlPoints || [];
        this.startKnot = startKnot !== undefined ? startKnot : (this.knots[this.degree] || 0);
        this.endKnot = endKnot !== undefined ? endKnot : (this.knots[this.knots.length - 1 - this.degree] || 1);
    }
    getPoint(t, optionalTarget) {
        var point = optionalTarget || new Vector3();
        var u = this.startKnot + (this.endKnot - this.startKnot) * t;
        var hpoint = NURBSUtils.calcBSplinePoint(this.degree, this.knots, this.controlPoints, u);
        var w = hpoint.w || 1.0;
        point.set(hpoint.x / w, hpoint.y / w, hpoint.z / w);
        return point;
    }
}

export { NURBSCurve };
