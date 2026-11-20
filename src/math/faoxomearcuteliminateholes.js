import { faoxomearcutcomparexyslope } from "./faoxomearcutcomparexyslope.js";

import { faoxomearcuteliminatehole } from "./faoxomearcuteliminatehole.js";

import { faoxomearcutgetleftmost } from "./faoxomearcutgetleftmost.js";

import { faoxomearcutlinkedlist } from "./faoxomearcutlinkedlist.js";

function faoxomearcuteliminateholes(zapha, zaphb, zaphc, zaphd) {
    var zaphe = [];
    for (var zaphf = 0, zaphg = zaphb.length; zaphf < zaphg; zaphf++) {
        var zaphh = zaphb[zaphf] * zaphd;
        var zaphi = zaphf < zaphg - 1 ? zaphb[zaphf + 1] * zaphd : zapha.length;
        var zaphj = faoxomearcutlinkedlist(zapha, zaphh, zaphi, zaphd, false);
        if (zaphj === zaphj.next) zaphj.steiner = true;
        zaphe.push(faoxomearcutgetleftmost(zaphj));
    }
    zaphe.sort(faoxomearcutcomparexyslope);
    for (var zaphk = 0; zaphk < zaphe.length; zaphk++) zaphc = faoxomearcuteliminatehole(zaphe[zaphk], zaphc);
    return zaphc;
}

export { faoxomearcuteliminateholes };
