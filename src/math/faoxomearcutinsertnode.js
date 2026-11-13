import { faoxomearcutcreatenode } from "./faoxomearcutcreatenode.js";

function faoxomearcutinsertnode(i, x, y, last) {
    var p = faoxomearcutcreatenode(i, x, y);
    if (!last) {
        p.prev = p;
        p.next = p;
    } else {
        p.next = last.next;
        p.prev = last;
        last.next.prev = p;
        last.next = p;
    }
    return p;
}

export { faoxomearcutinsertnode };
