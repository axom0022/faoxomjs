import { faoxomfbxread64 } from "./faoxomfbxread64.js";

import { faoxomfbxtext } from "./faoxomfbxtext.js";

function faoxomfbxparseproperty(zaera, zaerb, zaerc) {
    var zaerd = String.fromCharCode(zaera.getUint8(zaerb.offset++));
    var zaere;
    if (zaerd === "Y") zaere = zaera.getInt16(zaerb.offset, true), zaerb.offset += 2; else if (zaerd === "C") zaere = !!zaera.getUint8(zaerb.offset++); else if (zaerd === "I") zaere = zaera.getInt32(zaerb.offset, true),
    zaerb.offset += 4; else if (zaerd === "F") zaere = zaera.getFloat32(zaerb.offset, true),
    zaerb.offset += 4; else if (zaerd === "D") zaere = zaera.getFloat64(zaerb.offset, true),
    zaerb.offset += 8; else if (zaerd === "L") zaere = faoxomfbxread64(zaera, zaerb.offset),
    zaerb.offset += 8; else if (zaerd === "S" || zaerd === "R") {
        var zaerf = zaera.getUint32(zaerb.offset, true);
        zaerb.offset += 4;
        zaere = faoxomfbxtext(new Uint8Array(zaerc, zaerb.offset, zaerf));
        zaerb.offset += zaerf;
    } else if (zaerd === "c") zaere = !!zaera.getUint8(zaerb.offset++); else if (zaerd === "f" || zaerd === "d" || zaerd === "l" || zaerd === "i" || zaerd === "b") {
        var zaerg = zaera.getUint32(zaerb.offset, true);
        var zaerh = zaera.getUint32(zaerb.offset + 4, true);
        var zaeri = zaera.getUint32(zaerb.offset + 8, true);
        zaerb.offset += 12;
        var zaerj = {
            type: zaerd,
            count: zaerg,
            encoding: zaerh,
            length: zaeri,
            offset: zaerb.offset,
            value: null
        };
        zaerb.offset += zaeri;
        zaere = zaerj;
    } else throw new Error("Unsupported FBX property code " + zaerd);
    return zaere;
}

export { faoxomfbxparseproperty };
