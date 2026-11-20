import { faoxomearcutcreatenode } from "./faoxomearcutcreatenode.js";

function faoxomearcutsplitpolygon(zaqga, zaqgb) {
    var zaqgc = faoxomearcutcreatenode(zaqga.i, zaqga.x, zaqga.y), zaqgd = faoxomearcutcreatenode(zaqgb.i, zaqgb.x, zaqgb.y), zaqge = zaqga.next, zaqgf = zaqgb.prev;
    zaqga.next = zaqgb;
    zaqgb.prev = zaqga;
    zaqgc.next = zaqge;
    zaqge.prev = zaqgc;
    zaqgd.next = zaqgc;
    zaqgc.prev = zaqgd;
    zaqgf.next = zaqgd;
    zaqgd.prev = zaqgf;
    return zaqgd;
}

export { faoxomearcutsplitpolygon };
