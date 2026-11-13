import { faoxomearcutsortlinked } from "./faoxomearcutsortlinked.js";
import { faoxomearcutzorder } from "./faoxomearcutzorder.js";

function faoxomearcutindexcurve(start, minX, minY, invSize) {
    var p = start;
    do {
        if (p.z === 0) p.z = faoxomearcutzorder(p.x, p.y, minX, minY, invSize);
        p.prevZ = p.prev;
        p.nextZ = p.next;
        p = p.next;
    } while (p !== start);
    p.prevZ.nextZ = null;
    p.prevZ = null;
    faoxomearcutsortlinked(p);
}

export { faoxomearcutindexcurve };
