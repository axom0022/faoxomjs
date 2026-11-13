import { faoxomearcutcurelocalintersections } from "./faoxomearcutcurelocalintersections.js";
import { faoxomearcutfilterpoints } from "./faoxomearcutfilterpoints.js";
import { faoxomearcutindexcurve } from "./faoxomearcutindexcurve.js";
import { faoxomearcutisear } from "./faoxomearcutisear.js";
import { faoxomearcutisearhashed } from "./faoxomearcutisearhashed.js";
import { faoxomearcutremovenode } from "./faoxomearcutremovenode.js";
import { faoxomearcutsplitearcut } from "./faoxomearcutsplitearcut.js";

function faoxomearcutlinked(ear, triangles, dim, minX, minY, invSize, pass) {
    if (!ear) return;
    if (!pass && invSize) faoxomearcutindexcurve(ear, minX, minY, invSize);
    var stop = ear;
    while (ear.prev !== ear.next) {
        var prev = ear.prev, next = ear.next;
        if (invSize ? faoxomearcutisearhashed(ear, minX, minY, invSize) : faoxomearcutisear(ear)) {
            triangles.push(prev.i, ear.i, next.i);
            faoxomearcutremovenode(ear);
            ear = next.next;
            stop = next.next;
            continue;
        }
        ear = next;
        if (ear === stop) {
            if (!pass) {
                faoxomearcutlinked(faoxomearcutfilterpoints(ear), triangles, dim, minX, minY, invSize, 1);
            } else if (pass === 1) {
                ear = faoxomearcutcurelocalintersections(faoxomearcutfilterpoints(ear), triangles);
                faoxomearcutlinked(ear, triangles, dim, minX, minY, invSize, 2);
            } else if (pass === 2) {
                faoxomearcutsplitearcut(ear, triangles, dim, minX, minY, invSize);
            }
            break;
        }
    }
}

export { faoxomearcutlinked };
