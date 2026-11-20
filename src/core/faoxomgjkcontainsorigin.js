import { Vector3 } from "../math/index.js";

import { faoxomgjksimplex } from "./faoxomgjksimplex.js";

import { faoxomminkowskisupport } from "./faoxomminkowskisupport.js";

function faoxomgjkcontainsorigin(zaeza, zaezb) {
    var zaezc = (new Vector3).subVectors(zaezb.position, zaeza.position);
    if (zaezc.lengthSq() < 1e-8) zaezc.set(1, 0, 0);
    var zaezd = [ faoxomminkowskisupport(zaeza, zaezb, zaezc) ];
    zaezc.copy(zaezd[0]).negate();
    for (var zaeze = 0; zaeze < 32; zaeze++) {
        var zaezf = faoxomminkowskisupport(zaeza, zaezb, zaezc);
        if (zaezf.dot(zaezc) < 0) return false;
        zaezd.push(zaezf);
        if (faoxomgjksimplex(zaezd, zaezc)) return true;
    }
    return false;
}

export { faoxomgjkcontainsorigin };
