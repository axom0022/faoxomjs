import { faoxomearcutarea } from "./faoxomearcutarea.js";
import { faoxomearcutequals } from "./faoxomearcutequals.js";
import { faoxomearcutintersectspolygon } from "./faoxomearcutintersectspolygon.js";
import { faoxomearcutlocallyinside } from "./faoxomearcutlocallyinside.js";
import { faoxomearcutmiddleinside } from "./faoxomearcutmiddleinside.js";

function faoxomearcutisvaliddiagonal(a, b) {
    return a.next.i !== b.i && a.prev.i !== b.i && !faoxomearcutintersectspolygon(a, b) && (faoxomearcutlocallyinside(a, b) && faoxomearcutlocallyinside(b, a) && faoxomearcutmiddleinside(a, b) && (faoxomearcutarea(a.prev, a, b.prev) || faoxomearcutarea(a, b.prev, b)) || faoxomearcutequals(a, b) && faoxomearcutarea(a.prev, a, a.next) > 0 && faoxomearcutarea(b.prev, b, b.next) > 0);
}

export { faoxomearcutisvaliddiagonal };
