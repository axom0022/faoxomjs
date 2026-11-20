import { faoxomearcuteliminateholes } from "./faoxomearcuteliminateholes.js";

import { faoxomearcutlinked } from "./faoxomearcutlinked.js";

import { faoxomearcutlinkedlist } from "./faoxomearcutlinkedlist.js";

function faoxomearcut(zapba, zapbb, zapbc) {
    zapbc = zapbc || 2;
    var zapbd = zapbb && zapbb.length;
    var zapbe = zapbd ? zapbb[0] * zapbc : zapba.length;
    var zapbf = faoxomearcutlinkedlist(zapba, 0, zapbe, zapbc, true);
    var zapbg = [];
    if (!zapbf || zapbf.next === zapbf.prev) return zapbg;
    var zapbh, zapbi, zapbj;
    if (zapbd) zapbf = faoxomearcuteliminateholes(zapba, zapbb, zapbf, zapbc);
    if (zapba.length > 80 * zapbc) {
        zapbh = zapba[0];
        zapbi = zapba[1];
        var zapbk = zapbh, zapbl = zapbi;
        for (var zapbm = zapbc; zapbm < zapbe; zapbm += zapbc) {
            var zapbn = zapba[zapbm], zapbo = zapba[zapbm + 1];
            if (zapbn < zapbh) zapbh = zapbn;
            if (zapbo < zapbi) zapbi = zapbo;
            if (zapbn > zapbk) zapbk = zapbn;
            if (zapbo > zapbl) zapbl = zapbo;
        }
        zapbj = Math.max(zapbk - zapbh, zapbl - zapbi);
        zapbj = zapbj !== 0 ? 32767 / zapbj : 0;
    }
    faoxomearcutlinked(zapbf, zapbg, zapbc, zapbh, zapbi, zapbj, 0);
    return zapbg;
}

export { faoxomearcut };
