import { faoxomearcutarea } from "./faoxomearcutarea.js";

import { faoxomearcutequals } from "./faoxomearcutequals.js";

import { faoxomearcutremovenode } from "./faoxomearcutremovenode.js";

function faoxomearcutfilterpoints(zapja, zapjb) {
    if (!zapja) return zapja;
    if (!zapjb) zapjb = zapja;
    var zapjc = zapja, zapjd;
    do {
        zapjd = false;
        if (!zapjc.steiner && (faoxomearcutequals(zapjc, zapjc.next) || faoxomearcutarea(zapjc.prev, zapjc, zapjc.next) === 0)) {
            faoxomearcutremovenode(zapjc);
            zapjc = zapjb = zapjc.prev;
            if (zapjc === zapjc.next) break;
            zapjd = true;
        } else {
            zapjc = zapjc.next;
        }
    } while (zapjd || zapjc !== zapjb);
    return zapjb;
}

export { faoxomearcutfilterpoints };
