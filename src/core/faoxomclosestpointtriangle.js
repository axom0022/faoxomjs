import { Vector3 } from "../math/index.js";

function faoxomclosestpointtriangle(point, a, b, c) {
    var ab = new Vector3().subVectors(b, a); var ac = new Vector3().subVectors(c, a); var ap = new Vector3().subVectors(point, a); var d1 = ab.dot(ap); var d2 = ac.dot(ap); if (d1 <= 0 && d2 <= 0) return a.clone();
    var bp = new Vector3().subVectors(point, b); var d3 = ab.dot(bp); var d4 = ac.dot(bp); if (d3 >= 0 && d4 <= d3) return b.clone();
    var vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) return a.clone().addScaledVector(ab, d1 / (d1 - d3));
    var cp = new Vector3().subVectors(point, c); var d5 = ab.dot(cp); var d6 = ac.dot(cp); if (d6 >= 0 && d5 <= d6) return c.clone();
    var vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) return a.clone().addScaledVector(ac, d2 / (d2 - d6));
    var va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return b.clone().addScaledVector(new Vector3().subVectors(c, b), (d4 - d3) / ((d4 - d3) + (d5 - d6)));
    var denominator = 1 / (va + vb + vc); var v = vb * denominator; var w = vc * denominator; return a.clone().addScaledVector(ab, v).addScaledVector(ac, w);
}

export { faoxomclosestpointtriangle };
