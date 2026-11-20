import { faoxomearcutfilterpoints } from "./faoxomearcutfilterpoints.js";

import { faoxomearcutfindholebridge } from "./faoxomearcutfindholebridge.js";

import { faoxomearcutsplitpolygon } from "./faoxomearcutsplitpolygon.js";

function faoxomearcuteliminatehole(zapga, zapgb) {
    var zapgc = faoxomearcutfindholebridge(zapga, zapgb);
    if (!zapgc) return zapgb;
    var zapgd = faoxomearcutsplitpolygon(zapgc, zapga);
    faoxomearcutfilterpoints(zapgd, zapgd.next);
    return faoxomearcutfilterpoints(zapgc, zapgc.next);
}

export { faoxomearcuteliminatehole };
