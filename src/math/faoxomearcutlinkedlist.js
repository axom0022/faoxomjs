import { faoxomearcutequals } from "./faoxomearcutequals.js";
import { faoxomearcutinsertnode } from "./faoxomearcutinsertnode.js";
import { faoxomearcutremovenode } from "./faoxomearcutremovenode.js";
import { faoxomearcutsignedarea } from "./faoxomearcutsignedarea.js";

function faoxomearcutlinkedlist(data, start, end, dim, clockwise) {
    var last, i;
    if (clockwise === (faoxomearcutsignedarea(data, start, end, dim) > 0)) {
        for (i = start; i < end; i += dim) last = faoxomearcutinsertnode(i / dim | 0, data[i], data[i + 1], last);
    } else {
        for (i = end - dim; i >= start; i -= dim) last = faoxomearcutinsertnode(i / dim | 0, data[i], data[i + 1], last);
    }
    if (last && faoxomearcutequals(last, last.next)) {
        faoxomearcutremovenode(last);
        last = last.next;
    }
    return last;
}

export { faoxomearcutlinkedlist };
