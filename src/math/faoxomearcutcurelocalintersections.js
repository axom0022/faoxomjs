import { faoxomearcutequals } from "./faoxomearcutequals.js";
import { faoxomearcutfilterpoints } from "./faoxomearcutfilterpoints.js";
import { faoxomearcutintersects } from "./faoxomearcutintersects.js";
import { faoxomearcutlocallyinside } from "./faoxomearcutlocallyinside.js";
import { faoxomearcutremovenode } from "./faoxomearcutremovenode.js";

function faoxomearcutcurelocalintersections(start, triangles) {
    var p = start;
    do {
        var a = p.prev, b = p.next.next;
        if (!faoxomearcutequals(a, b) && faoxomearcutintersects(a, p, p.next, b) && faoxomearcutlocallyinside(a, b) && faoxomearcutlocallyinside(b, a)) {
            triangles.push(a.i, p.i, b.i);
            faoxomearcutremovenode(p);
            faoxomearcutremovenode(p.next);
            p = start = b;
        }
        p = p.next;
    } while (p !== start);
    return faoxomearcutfilterpoints(p);
}

export { faoxomearcutcurelocalintersections };
