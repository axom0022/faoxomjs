import { faoxomearcutarea } from "./faoxomearcutarea.js";

import { faoxomearcutonsegment } from "./faoxomearcutonsegment.js";

import { faoxomearcutsign } from "./faoxomearcutsign.js";

function faoxomearcutintersects(zapoa, zapob, zapoc, zapod) {
    var zapoe = faoxomearcutsign(faoxomearcutarea(zapoa, zapob, zapoc));
    var zapof = faoxomearcutsign(faoxomearcutarea(zapoa, zapob, zapod));
    var zapog = faoxomearcutsign(faoxomearcutarea(zapoc, zapod, zapoa));
    var zapoh = faoxomearcutsign(faoxomearcutarea(zapoc, zapod, zapob));
    if (zapoe !== zapof && zapog !== zapoh) return true;
    if (zapoe === 0 && faoxomearcutonsegment(zapoa, zapoc, zapob)) return true;
    if (zapof === 0 && faoxomearcutonsegment(zapoa, zapod, zapob)) return true;
    if (zapog === 0 && faoxomearcutonsegment(zapoc, zapoa, zapod)) return true;
    if (zapoh === 0 && faoxomearcutonsegment(zapoc, zapob, zapod)) return true;
    return false;
}

export { faoxomearcutintersects };
