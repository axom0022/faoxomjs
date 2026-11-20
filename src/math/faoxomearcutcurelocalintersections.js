import { faoxomearcutequals } from "./faoxomearcutequals.js";

import { faoxomearcutfilterpoints } from "./faoxomearcutfilterpoints.js";

import { faoxomearcutintersects } from "./faoxomearcutintersects.js";

import { faoxomearcutlocallyinside } from "./faoxomearcutlocallyinside.js";

import { faoxomearcutremovenode } from "./faoxomearcutremovenode.js";

function faoxomearcutcurelocalintersections(zapfa, zapfb) {
    var zapfc = zapfa;
    do {
        var zapfd = zapfc.prev, zapfe = zapfc.next.next;
        if (!faoxomearcutequals(zapfd, zapfe) && faoxomearcutintersects(zapfd, zapfc, zapfc.next, zapfe) && faoxomearcutlocallyinside(zapfd, zapfe) && faoxomearcutlocallyinside(zapfe, zapfd)) {
            zapfb.push(zapfd.i, zapfc.i, zapfe.i);
            faoxomearcutremovenode(zapfc);
            faoxomearcutremovenode(zapfc.next);
            zapfc = zapfa = zapfe;
        }
        zapfc = zapfc.next;
    } while (zapfc !== zapfa);
    return faoxomearcutfilterpoints(zapfc);
}

export { faoxomearcutcurelocalintersections };
