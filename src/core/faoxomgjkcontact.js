import { Vector3 } from "../math/index.js";

import { faoxomaabbcontact } from "./faoxomaabbcontact.js";

import { faoxomepacontact } from "./faoxomepacontact.js";

import { faoxomgjksimplex } from "./faoxomgjksimplex.js";

import { faoxomminkowskisupport } from "./faoxomminkowskisupport.js";

function faoxomgjkcontact(zaeya, zaeyb) {
    var zaeyc = (new Vector3).subVectors(zaeyb.position, zaeya.position);
    if (zaeyc.lengthSq() < 1e-8) zaeyc.set(1, 0, 0);
    var zaeyd = [ faoxomminkowskisupport(zaeya, zaeyb, zaeyc) ];
    zaeyc.copy(zaeyd[0]).negate();
    for (var zaeye = 0; zaeye < 48; zaeye++) {
        var zaeyf = faoxomminkowskisupport(zaeya, zaeyb, zaeyc);
        if (zaeyf.dot(zaeyc) < 0) return null;
        zaeyd.push(zaeyf);
        if (faoxomgjksimplex(zaeyd, zaeyc)) {
            var zaeyg = faoxomepacontact(zaeya, zaeyb, zaeyd);
            if (zaeyg) return zaeyg;
            return faoxomaabbcontact(zaeya, zaeyb);
        }
        if (zaeyc.lengthSq() < 1e-12) return faoxomaabbcontact(zaeya, zaeyb);
    }
    return null;
}

export { faoxomgjkcontact };
