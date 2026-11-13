import { Vector3 } from "../math/index.js";
import { faoxomaabbcontact } from "./faoxomaabbcontact.js";
import { faoxomepacontact } from "./faoxomepacontact.js";
import { faoxomgjksimplex } from "./faoxomgjksimplex.js";
import { faoxomminkowskisupport } from "./faoxomminkowskisupport.js";

function faoxomgjkcontact(a, b) {
    var direction = new Vector3().subVectors(b.position, a.position);
    if (direction.lengthSq() < 1e-8) direction.set(1, 0, 0);
    var simplex = [faoxomminkowskisupport(a, b, direction)];
    direction.copy(simplex[0]).negate();
    for (var iteration = 0; iteration < 48; iteration++) {
        var point = faoxomminkowskisupport(a, b, direction);
        if (point.dot(direction) < 0) return null;
        simplex.push(point);
        if (faoxomgjksimplex(simplex, direction)) {
            var epa = faoxomepacontact(a, b, simplex);
            if (epa) return epa;
            return faoxomaabbcontact(a, b);
        }
        if (direction.lengthSq() < 1e-12) return faoxomaabbcontact(a, b);
    }
    return null;
}

export { faoxomgjkcontact };
