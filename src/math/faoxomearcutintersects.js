import { faoxomearcutarea } from "./faoxomearcutarea.js";
import { faoxomearcutonsegment } from "./faoxomearcutonsegment.js";
import { faoxomearcutsign } from "./faoxomearcutsign.js";

function faoxomearcutintersects(p1, q1, p2, q2) {
    var o1 = faoxomearcutsign(faoxomearcutarea(p1, q1, p2));
    var o2 = faoxomearcutsign(faoxomearcutarea(p1, q1, q2));
    var o3 = faoxomearcutsign(faoxomearcutarea(p2, q2, p1));
    var o4 = faoxomearcutsign(faoxomearcutarea(p2, q2, q1));
    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && faoxomearcutonsegment(p1, p2, q1)) return true;
    if (o2 === 0 && faoxomearcutonsegment(p1, q2, q1)) return true;
    if (o3 === 0 && faoxomearcutonsegment(p2, p1, q2)) return true;
    if (o4 === 0 && faoxomearcutonsegment(p2, q1, q2)) return true;
    return false;
}

export { faoxomearcutintersects };
