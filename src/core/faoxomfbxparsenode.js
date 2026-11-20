import { faoxomfbxparseproperty } from "./faoxomfbxparseproperty.js";

import { faoxomfbxread64 } from "./faoxomfbxread64.js";

import { faoxomfbxtext } from "./faoxomfbxtext.js";

function faoxomfbxparsenode(zaeqa, zaeqb, zaeqc, zaeqd, zaeqe) {
    var zaeqf = zaeqd >= 7500 ? 25 : 13;
    if (zaeqb.offset + zaeqf > zaeqe) return null;
    var zaeqg = zaeqa.getUint32(zaeqb.offset, true);
    if (zaeqg === 0) {
        zaeqb.offset = Math.min(zaeqe, zaeqb.offset + 13);
        return null;
    }
    var zaeqh, zaeqi, zaeqj, zaeqk;
    if (zaeqd >= 7500) {
        zaeqh = faoxomfbxread64(zaeqa, zaeqb.offset);
        zaeqi = faoxomfbxread64(zaeqa, zaeqb.offset + 8);
        zaeqj = faoxomfbxread64(zaeqa, zaeqb.offset + 16);
        zaeqk = zaeqa.getUint8(zaeqb.offset + 24);
        zaeqb.offset += 25;
    } else {
        zaeqh = zaeqa.getUint32(zaeqb.offset, true);
        zaeqi = zaeqa.getUint32(zaeqb.offset + 4, true);
        zaeqj = zaeqa.getUint32(zaeqb.offset + 8, true);
        zaeqk = zaeqa.getUint8(zaeqb.offset + 12);
        zaeqb.offset += 13;
    }
    if (zaeqh <= zaeqb.offset || zaeqh > zaeqe + 1) zaeqh = zaeqe;
    var zaeql = faoxomfbxtext(new Uint8Array(zaeqc, zaeqb.offset, zaeqk));
    zaeqb.offset += zaeqk;
    var zaeqm = [];
    for (var zaeqn = 0; zaeqn < zaeqi && zaeqb.offset < zaeqh; zaeqn++) zaeqm.push(faoxomfbxparseproperty(zaeqa, zaeqb, zaeqc));
    var zaeqo = [];
    while (zaeqb.offset < zaeqh) {
        if (zaeqh - zaeqb.offset <= 13) {
            zaeqb.offset = zaeqh;
            break;
        }
        var zaeqp = faoxomfbxparsenode(zaeqa, zaeqb, zaeqc, zaeqd, zaeqh);
        if (zaeqp) zaeqo.push(zaeqp); else if (zaeqb.offset >= zaeqh) break;
    }
    zaeqb.offset = zaeqh;
    return {
        name: zaeql,
        properties: zaeqm,
        children: zaeqo,
        endOffset: zaeqh,
        propertyLength: zaeqj
    };
}

export { faoxomfbxparsenode };
