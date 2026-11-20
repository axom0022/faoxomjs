import { faoxomearcutcurelocalintersections } from "./faoxomearcutcurelocalintersections.js";

import { faoxomearcutfilterpoints } from "./faoxomearcutfilterpoints.js";

import { faoxomearcutindexcurve } from "./faoxomearcutindexcurve.js";

import { faoxomearcutisear } from "./faoxomearcutisear.js";

import { faoxomearcutisearhashed } from "./faoxomearcutisearhashed.js";

import { faoxomearcutremovenode } from "./faoxomearcutremovenode.js";

import { faoxomearcutsplitearcut } from "./faoxomearcutsplitearcut.js";

function faoxomearcutlinked(zapta, zaptb, zaptc, zaptd, zapte, zaptf, zaptg) {
    if (!zapta) return;
    if (!zaptg && zaptf) faoxomearcutindexcurve(zapta, zaptd, zapte, zaptf);
    var zapth = zapta;
    while (zapta.prev !== zapta.next) {
        var zapti = zapta.prev, zaptj = zapta.next;
        if (zaptf ? faoxomearcutisearhashed(zapta, zaptd, zapte, zaptf) : faoxomearcutisear(zapta)) {
            zaptb.push(zapti.i, zapta.i, zaptj.i);
            faoxomearcutremovenode(zapta);
            zapta = zaptj.next;
            zapth = zaptj.next;
            continue;
        }
        zapta = zaptj;
        if (zapta === zapth) {
            if (!zaptg) {
                faoxomearcutlinked(faoxomearcutfilterpoints(zapta), zaptb, zaptc, zaptd, zapte, zaptf, 1);
            } else if (zaptg === 1) {
                zapta = faoxomearcutcurelocalintersections(faoxomearcutfilterpoints(zapta), zaptb);
                faoxomearcutlinked(zapta, zaptb, zaptc, zaptd, zapte, zaptf, 2);
            } else if (zaptg === 2) {
                faoxomearcutsplitearcut(zapta, zaptb, zaptc, zaptd, zapte, zaptf);
            }
            break;
        }
    }
}

export { faoxomearcutlinked };
