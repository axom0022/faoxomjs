import { Vector4 } from "./Vector4.js";

class NURBSUtils {
    static findSpan(p, u, U) {
        var n = U.length - p - 2;
        if (u >= U[n + 1]) return n;
        if (u <= U[p]) return p;
        var low = p, high = n + 1, mid = Math.floor((low + high) / 2);
        while (u < U[mid] || u >= U[mid + 1]) {
            if (u < U[mid]) high = mid; else low = mid;
            mid = Math.floor((low + high) / 2);
        }
        return mid;
    }
    static calcBasisFunctions(span, u, p, U) {
        var N = [1.0], left = [0.0], right = [0.0];
        for (var j = 1; j <= p; j++) {
            left[j] = u - U[span + 1 - j];
            right[j] = U[span + j] - u;
            var saved = 0.0;
            for (var r = 0; r < j; r++) {
                var rv = right[r + 1], lv = left[j - r];
                var temp = N[r] / (rv + lv);
                N[r] = saved + rv * temp;
                saved = lv * temp;
            }
            N[j] = saved;
        }
        return N;
    }
    static calcBSplinePoint(p, U, P, u) {
        var span = this.findSpan(p, u, U), N = this.calcBasisFunctions(span, u, p, U), C = new Vector4(0, 0, 0, 0);
        for (var i = 0; i <= p; i++) {
            var pt = P[span - p + i], basis = N[i];
            C.x += basis * pt.x; C.y += basis * pt.y; C.z += basis * pt.z; C.w += basis * (pt.w !== undefined ? pt.w : 1.0);
        }
        return C;
    }
}

export { NURBSUtils };
