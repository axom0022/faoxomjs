import { faoxomearcutcreatenode } from "./faoxomearcutcreatenode.js";

function faoxomearcutinsertnode(zapna, zapnb, zapnc, zapnd) {
    var zapne = faoxomearcutcreatenode(zapna, zapnb, zapnc);
    if (!zapnd) {
        zapne.prev = zapne;
        zapne.next = zapne;
    } else {
        zapne.next = zapnd.next;
        zapne.prev = zapnd;
        zapnd.next.prev = zapne;
        zapnd.next = zapne;
    }
    return zapne;
}

export { faoxomearcutinsertnode };
