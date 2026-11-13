import { faoxomearcutarea } from "./faoxomearcutarea.js";
import { faoxomearcutequals } from "./faoxomearcutequals.js";
import { faoxomearcutremovenode } from "./faoxomearcutremovenode.js";

function faoxomearcutfilterpoints(start, end) {
    if (!start) return start;
    if (!end) end = start;
    var p = start, again;
    do {
        again = false;
        if (!p.steiner && (faoxomearcutequals(p, p.next) || faoxomearcutarea(p.prev, p, p.next) === 0)) {
            faoxomearcutremovenode(p);
            p = end = p.prev;
            if (p === p.next) break;
            again = true;
        } else {
            p = p.next;
        }
    } while (again || p !== end);
    return end;
}

export { faoxomearcutfilterpoints };
