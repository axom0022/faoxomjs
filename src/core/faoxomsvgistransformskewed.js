import { faoxomsvggettransformscalex } from "./faoxomsvggettransformscalex.js";
import { faoxomsvggettransformscaley } from "./faoxomsvggettransformscaley.js";

function faoxomsvgistransformskewed(m) {
    var te = m.elements;
    var basisDot = te[0] * te[3] + te[1] * te[4];
    if (basisDot === 0) return false;
    var sx = faoxomsvggettransformscalex(m), sy = faoxomsvggettransformscaley(m);
    return Math.abs(basisDot / (sx * sy)) > 1e-6;
}

export { faoxomsvgistransformskewed };
