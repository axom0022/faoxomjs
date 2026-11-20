import { faoxomearcutarea } from "./faoxomearcutarea.js";

import { faoxomearcutequals } from "./faoxomearcutequals.js";

import { faoxomearcutintersectspolygon } from "./faoxomearcutintersectspolygon.js";

import { faoxomearcutlocallyinside } from "./faoxomearcutlocallyinside.js";

import { faoxomearcutmiddleinside } from "./faoxomearcutmiddleinside.js";

function faoxomearcutisvaliddiagonal(zapsa, zapsb) {
    return zapsa.next.i !== zapsb.i && zapsa.prev.i !== zapsb.i && !faoxomearcutintersectspolygon(zapsa, zapsb) && (faoxomearcutlocallyinside(zapsa, zapsb) && faoxomearcutlocallyinside(zapsb, zapsa) && faoxomearcutmiddleinside(zapsa, zapsb) && (faoxomearcutarea(zapsa.prev, zapsa, zapsb.prev) || faoxomearcutarea(zapsa, zapsb.prev, zapsb)) || faoxomearcutequals(zapsa, zapsb) && faoxomearcutarea(zapsa.prev, zapsa, zapsa.next) > 0 && faoxomearcutarea(zapsb.prev, zapsb, zapsb.next) > 0);
}

export { faoxomearcutisvaliddiagonal };
