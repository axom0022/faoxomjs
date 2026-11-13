import { faoxomearcutfilterpoints } from "./faoxomearcutfilterpoints.js";
import { faoxomearcutisvaliddiagonal } from "./faoxomearcutisvaliddiagonal.js";
import { faoxomearcutlinked } from "./faoxomearcutlinked.js";
import { faoxomearcutsplitpolygon } from "./faoxomearcutsplitpolygon.js";

function faoxomearcutsplitearcut(start, triangles, dim, minX, minY, invSize) {
    var a = start;
    do {
        var b = a.next.next;
        while (b !== a.prev) {
            if (a.i !== b.i && faoxomearcutisvaliddiagonal(a, b)) {
                var c = faoxomearcutsplitpolygon(a, b);
                a = faoxomearcutfilterpoints(a, a.next);
                c = faoxomearcutfilterpoints(c, c.next);
                faoxomearcutlinked(a, triangles, dim, minX, minY, invSize, 0);
                faoxomearcutlinked(c, triangles, dim, minX, minY, invSize, 0);
                return;
            }
            b = b.next;
        }
        a = a.next;
    } while (a !== start);
}

export { faoxomearcutsplitearcut };
