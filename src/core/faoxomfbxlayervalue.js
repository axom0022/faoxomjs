import { faoxomfbxarray } from "./faoxomfbxarray.js";

import { faoxomfbxchild } from "./faoxomfbxchild.js";

import { faoxomfbxnumber } from "./faoxomfbxnumber.js";

function faoxomfbxlayervalue(zaena, zaenb, zaenc, zaend, zaene, zaenf, zaeng) {
    if (!zaena) return zaeng;
    var zaenh = String(faoxomfbxchild(zaena, "MappingInformationType") ? faoxomfbxchild(zaena, "MappingInformationType").properties[0] : "ByPolygonVertex");
    var zaeni = String(faoxomfbxchild(zaena, "ReferenceInformationType") ? faoxomfbxchild(zaena, "ReferenceInformationType").properties[0] : "Direct");
    var zaenj = faoxomfbxarray(zaena, zaenb) || [];
    var zaenk = faoxomfbxarray(zaena, zaenc) || [];
    var zaenl = zaenh === "ByVertice" || zaenh === "ByVertex" ? zaene : zaenh === "ByPolygon" ? zaenf : zaenh === "AllSame" ? 0 : zaend;
    if (zaeni === "IndexToDirect") zaenl = faoxomfbxnumber(zaenk[zaenl]);
    return zaenj.length ? zaenl : zaeng;
}

export { faoxomfbxlayervalue };
