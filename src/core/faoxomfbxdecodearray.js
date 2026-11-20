import { faoxomfbxinflate } from "./faoxomfbxinflate.js";

async function faoxomfbxdecodearray(zaeka, zaekb, zaekc) {
    var zaekd = new Uint8Array(zaekc, zaeka.offset, zaeka.length);
    if (zaeka.encoding === 1) zaekd = await faoxomfbxinflate(zaekd);
    var zaeke = new DataView(zaekd.buffer, zaekd.byteOffset, zaekd.byteLength);
    var zaekf = zaeka.count, zaekg = zaeka.type, zaekh;
    if (zaekg === "f") zaekh = new Float32Array(zaekf); else if (zaekg === "d") zaekh = new Float64Array(zaekf); else if (zaekg === "i") zaekh = new Int32Array(zaekf); else if (zaekg === "l") zaekh = new Float64Array(zaekf); else if (zaekg === "b") zaekh = new Uint8Array(zaekf); else return zaekd;
    var zaeki = zaekg === "f" || zaekg === "i" ? 4 : zaekg === "d" || zaekg === "l" ? 8 : 1;
    for (var zaekj = 0; zaekj < zaekf; zaekj++) {
        if (zaekg === "f") zaekh[zaekj] = zaeke.getFloat32(zaekj * zaeki, true); else if (zaekg === "d") zaekh[zaekj] = zaeke.getFloat64(zaekj * zaeki, true); else if (zaekg === "i") zaekh[zaekj] = zaeke.getInt32(zaekj * zaeki, true); else if (zaekg === "l") zaekh[zaekj] = zaeke.getInt32(zaekj * zaeki, true) + zaeke.getInt32(zaekj * zaeki + 4, true) * 4294967296; else zaekh[zaekj] = zaeke.getUint8(zaekj);
    }
    return zaekh;
}

export { faoxomfbxdecodearray };
