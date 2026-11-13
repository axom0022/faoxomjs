import { Matrix3, Vector2 } from "../math/index.js";
import { faoxomsvgeigendecomposition } from "./faoxomsvgeigendecomposition.js";
import { faoxomsvggettransformscalex } from "./faoxomsvggettransformscalex.js";
import { faoxomsvggettransformscaley } from "./faoxomsvggettransformscaley.js";
import { faoxomsvgistransformflipped } from "./faoxomsvgistransformflipped.js";
import { faoxomsvgistransformskewed } from "./faoxomsvgistransformskewed.js";

function faoxomsvgtransformpath(path, m) {
    function transfVec2(v2) {
        var x = m.elements[0] * v2.x + m.elements[3] * v2.y + m.elements[6];
        var y = m.elements[1] * v2.x + m.elements[4] * v2.y + m.elements[7];
        v2.set(x, y);
    }
    function transfEllipseGeneric(curve) {
        var a = curve.xRadius, b = curve.yRadius;
        var cosTheta = Math.cos(curve.rotation), sinTheta = Math.sin(curve.rotation);
        var v1x = a * cosTheta, v1y = a * sinTheta;
        var v2x = -b * sinTheta, v2y = b * cosTheta;
        var f1x = m.elements[0] * v1x + m.elements[3] * v1y, f1y = m.elements[1] * v1x + m.elements[4] * v1y;
        var f2x = m.elements[0] * v2x + m.elements[3] * v2y, f2y = m.elements[1] * v2x + m.elements[4] * v2y;
        var mF = new Matrix3().set(f1x, f2x, 0, f1y, f2y, 0, 0, 0, 1);
        var mFInv = new Matrix3().copy(mF).invert();
        var mFInvT = new Matrix3().copy(mFInv).transpose();
        var mQ = mFInvT.multiply(mFInv);
        var mQe = mQ.elements;
        var ed = faoxomsvgeigendecomposition(mQe[0], mQe[1], mQe[4]);
        var rt1sqrt = Math.sqrt(ed.rt1), rt2sqrt = Math.sqrt(ed.rt2);
        curve.xRadius = 1 / rt1sqrt;
        curve.yRadius = 1 / rt2sqrt;
        curve.rotation = Math.atan2(ed.sn, ed.cs);
        var isFullEllipse = (curve.endAngle - curve.startAngle) % (Math.PI * 2) < Number.EPSILON;
        if (!isFullEllipse) {
            var mDsqrt = new Matrix3().set(rt1sqrt, 0, 0, 0, rt2sqrt, 0, 0, 0, 1);
            var mRT = new Matrix3().set(ed.cs, ed.sn, 0, -ed.sn, ed.cs, 0, 0, 0, 1);
            var mDRF = mDsqrt.multiply(mRT).multiply(mF);
            function transformAngle(phi) {
                var c = Math.cos(phi), s = Math.sin(phi);
                var cosR = mDRF.elements[0] * c + mDRF.elements[3] * s;
                var sinR = mDRF.elements[1] * c + mDRF.elements[4] * s;
                return Math.atan2(sinR, cosR);
            }
            curve.startAngle = transformAngle(curve.startAngle);
            curve.endAngle = transformAngle(curve.endAngle);
            if (faoxomsvgistransformflipped(m)) curve.clockwise = !curve.clockwise;
        }
    }
    function transfEllipseNoSkew(curve) {
        var sx = faoxomsvggettransformscalex(m), sy = faoxomsvggettransformscaley(m);
        curve.xRadius *= sx;
        curve.yRadius *= sy;
        var theta = sx > Number.EPSILON ? Math.atan2(m.elements[1], m.elements[0]) : Math.atan2(-m.elements[3], m.elements[4]);
        curve.rotation += theta;
        if (faoxomsvgistransformflipped(m)) {
            curve.startAngle *= -1;
            curve.endAngle *= -1;
            curve.clockwise = !curve.clockwise;
        }
    }
    var subPaths = path.subPaths;
    for (var i = 0; i < subPaths.length; i++) {
        var curves = subPaths[i].curves;
        for (var j = 0; j < curves.length; j++) {
            var curve = curves[j];
            if (curve.type === "line") { transfVec2(curve.v1); transfVec2(curve.v2); }
            else if (curve.type === "bezier") { transfVec2(curve.v0); transfVec2(curve.v1); transfVec2(curve.v2); transfVec2(curve.v3); }
            else if (curve.type === "quadratic") { transfVec2(curve.v0); transfVec2(curve.v1); transfVec2(curve.v2); }
            else if (curve.type === "arc") {
                var center = new Vector2(curve.cx, curve.cy);
                transfVec2(center);
                curve.cx = center.x;
                curve.cy = center.y;
                if (faoxomsvgistransformskewed(m)) transfEllipseGeneric(curve);
                else transfEllipseNoSkew(curve);
            }
        }
    }
}

export { faoxomsvgtransformpath };
