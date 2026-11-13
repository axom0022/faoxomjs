import { faoxomearcutintersects } from "./faoxomearcutintersects.js";

function faoxomearcutintersectspolygon(a, b) {
    var p = a;
    do {
        if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i && faoxomearcutintersects(p, p.next, a, b)) return true;
        p = p.next;
    } while (p !== a);
    return false;
}

export { faoxomearcutintersectspolygon };
