import { faoxomearcutfilterpoints } from "./faoxomearcutfilterpoints.js";

import { faoxomearcutisvaliddiagonal } from "./faoxomearcutisvaliddiagonal.js";

import { faoxomearcutlinked } from "./faoxomearcutlinked.js";

import { faoxomearcutsplitpolygon } from "./faoxomearcutsplitpolygon.js";

function faoxomearcutsplitearcut(zaqfa, zaqfb, zaqfc, zaqfd, zaqfe, zaqff) {
    var zaqfg = zaqfa;
    do {
        var zaqfh = zaqfg.next.next;
        while (zaqfh !== zaqfg.prev) {
            if (zaqfg.i !== zaqfh.i && faoxomearcutisvaliddiagonal(zaqfg, zaqfh)) {
                var zaqfi = faoxomearcutsplitpolygon(zaqfg, zaqfh);
                zaqfg = faoxomearcutfilterpoints(zaqfg, zaqfg.next);
                zaqfi = faoxomearcutfilterpoints(zaqfi, zaqfi.next);
                faoxomearcutlinked(zaqfg, zaqfb, zaqfc, zaqfd, zaqfe, zaqff, 0);
                faoxomearcutlinked(zaqfi, zaqfb, zaqfc, zaqfd, zaqfe, zaqff, 0);
                return;
            }
            zaqfh = zaqfh.next;
        }
        zaqfg = zaqfg.next;
    } while (zaqfg !== zaqfa);
}

export { faoxomearcutsplitearcut };
