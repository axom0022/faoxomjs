import { faoxomfbxarray } from "./faoxomfbxarray.js";

import { faoxomfbxlayervalue } from "./faoxomfbxlayervalue.js";

import { faoxomfbxnumber } from "./faoxomfbxnumber.js";

function faoxomfbxlayertuple(zaema, zaemb, zaemc, zaemd, zaeme, zaemf, zaemg, zaemh) {
    var zaemi = faoxomfbxlayervalue(zaema, zaemb, zaemc, zaemd, zaeme, zaemf, -1);
    var zaemj = zaema ? faoxomfbxarray(zaema, zaemb) : null;
    if (!zaemj || zaemi < 0) return zaemh.slice();
    var zaemk = [];
    for (var zaeml = 0; zaeml < zaemg; zaeml++) zaemk.push(faoxomfbxnumber(zaemj[zaemi * zaemg + zaeml]));
    return zaemk;
}

export { faoxomfbxlayertuple };
