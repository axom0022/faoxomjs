import { NURBSUtils } from "./NURBSUtils.js";
import { Vector3 } from "./Vector3.js";
import { Vector4 } from "./Vector4.js";

class NURBSSurface {
    constructor(degree1, degree2, knots1, knots2, controlPoints) {
        this.degree1 = degree1 || 3;
        this.degree2 = degree2 || 3;
        this.knots1 = knots1 || [];
        this.knots2 = knots2 || [];
        this.controlPoints = controlPoints || [];
    }
    getPoint(t1, t2, target) {
        var u = this.knots1[this.degree1] + (this.knots1[this.knots1.length - 1 - this.degree1] - this.knots1[this.degree1]) * t1;
        var v = this.knots2[this.degree2] + (this.knots2[this.knots2.length - 1 - this.degree2] - this.knots2[this.degree2]) * t2;
        var span1 = NURBSUtils.findSpan(this.degree1, u, this.knots1);
        var span2 = NURBSUtils.findSpan(this.degree2, v, this.knots2);
        var N1 = NURBSUtils.calcBasisFunctions(span1, u, this.degree1, this.knots1);
        var N2 = NURBSUtils.calcBasisFunctions(span2, v, this.degree2, this.knots2);
        var pt = new Vector4(0, 0, 0, 0);
        for (var l = 0; l <= this.degree2; l++) {
            var temp = new Vector4(0, 0, 0, 0);
            for (var k = 0; k <= this.degree1; k++) {
                var p = this.controlPoints[span1 - this.degree1 + k][span2 - this.degree2 + l];
                var w = p.w !== undefined ? p.w : 1.0;
                temp.x += N1[k] * p.x * w; temp.y += N1[k] * p.y * w; temp.z += N1[k] * p.z * w; temp.w += N1[k] * w;
            }
            pt.x += N2[l] * temp.x; pt.y += N2[l] * temp.y; pt.z += N2[l] * temp.z; pt.w += N2[l] * temp.w;
        }
        var out = target || new Vector3();
        var wFinal = pt.w || 1.0;
        out.set(pt.x / wFinal, pt.y / wFinal, pt.z / wFinal);
        return out;
    }
}

export { NURBSSurface };
