function faoxomdecodedds(zadta) {
    var zadtb = zadta instanceof Uint8Array ? zadta : new Uint8Array(zadta);
    if (zadtb.length < 128 || zadtb[0] !== 68 || zadtb[1] !== 68 || zadtb[2] !== 83 || zadtb[3] !== 32) throw new Error("Invalid DDS magic");
    var zadtc = new DataView(zadtb.buffer, zadtb.byteOffset, zadtb.byteLength);
    var zadtd = zadtc.getUint32(8, true), zadte = zadtc.getUint32(12, true), zadtf = zadtc.getUint32(16, true);
    var zadtg = zadtd & 131072 ? Math.max(1, zadtc.getUint32(28, true)) : 1;
    var zadth = zadtc.getUint32(112, true);
    var zadti = zadtc.getUint32(80, true);
    var zadtj = String.fromCharCode(zadtb[84], zadtb[85], zadtb[86], zadtb[87]);
    var zadtk = zadtc.getUint32(88, true);
    var zadtl = {
        r: zadtc.getUint32(92, true),
        g: zadtc.getUint32(96, true),
        b: zadtc.getUint32(100, true),
        a: zadtc.getUint32(104, true)
    };
    var zadtm = (zadth & 65024) !== 0;
    var zadtn = zadtm ? 6 : 1;
    var zadto = null, zadtp = 0;
    if (zadti & 4) {
        if (zadtj === "DXT1") {
            zadto = "dxt1";
            zadtp = 8;
        } else if (zadtj === "DXT3") {
            zadto = "dxt3";
            zadtp = 16;
        } else if (zadtj === "DXT5") {
            zadto = "dxt5";
            zadtp = 16;
        } else throw new Error("Unsupported DDS FourCC " + zadtj);
    } else if (zadti & 65 && (zadtk === 24 || zadtk === 32)) {
        zadto = "rgba";
        zadtp = zadtk / 8;
    } else throw new Error("Unsupported DDS pixel format");
    var zadtq = function(zadta) {
        return [ Math.round((zadta >> 11 & 31) * 255 / 31), Math.round((zadta >> 5 & 63) * 255 / 63), Math.round((zadta & 31) * 255 / 31) ];
    };
    var zadtr = function(zadta, zadtb, zadtc, zadtd, zadte, zadtf, zadtg) {
        var zadth = zadto === "dxt1" ? zadtb : zadtb + 8;
        var zadti = zadta[zadth] | zadta[zadth + 1] << 8, zadtj = zadta[zadth + 2] | zadta[zadth + 3] << 8;
        var zadtk = zadtq(zadti), zadtl = zadtq(zadtj);
        var zadtm = [ zadtk, zadtl, [ 0, 0, 0 ], [ 0, 0, 0 ] ];
        var zadtn = zadto !== "dxt1" || zadti > zadtj;
        if (zadtn) {
            zadtm[2] = [ (zadtk[0] * 2 + zadtl[0]) / 3, (zadtk[1] * 2 + zadtl[1]) / 3, (zadtk[2] * 2 + zadtl[2]) / 3 ];
            zadtm[3] = [ (zadtk[0] + zadtl[0] * 2) / 3, (zadtk[1] + zadtl[1] * 2) / 3, (zadtk[2] + zadtl[2] * 2) / 3 ];
        } else {
            zadtm[2] = [ (zadtk[0] + zadtl[0]) / 2, (zadtk[1] + zadtl[1]) / 2, (zadtk[2] + zadtl[2]) / 2 ];
            zadtm[3] = [ 0, 0, 0 ];
        }
        var zadtp = zadth + 4;
        var zadtr = 0;
        for (var zadts = 0; zadts < 4; zadts++) zadtr |= zadta[zadtp + zadts] << 8 * zadts;
        for (var zadtt = 0; zadtt < 16; zadtt++) {
            var zadtu = zadtr >> zadtt * 2 & 3;
            var zadtv = zadtm[zadtu];
            var zadtw = 255;
            if (!zadtn && zadtu === 3) zadtw = 0;
            if (zadto === "dxt3") {
                var zadtx = zadta[zadtb + Math.floor(zadtt / 2)] >> zadtt % 2 * 4 & 15;
                zadtw = Math.round(zadtx * 255 / 15);
            } else if (zadto === "dxt5") {
                var zadty = zadta[zadtb], zadtz = zadta[zadtb + 1];
                var zadtaa = 0;
                for (var zadtab = 5; zadtab >= 0; zadtab--) zadtaa = zadtaa * 256 + zadta[zadtb + 2 + zadtab];
                var zadtac = Math.floor(zadtaa / Math.pow(2, zadtt * 3)) % 8;
                if (zadtac === 0) zadtw = zadty; else if (zadtac === 1) zadtw = zadtz; else if (zadty > zadtz) zadtw = Math.round(((8 - zadtac) * zadty + (zadtac - 1) * zadtz) / 7); else zadtw = zadtac < 6 ? Math.round(((6 - zadtac) * zadty + (zadtac - 1) * zadtz) / 5) : zadtac === 6 ? 0 : 255;
            }
            var zadtad = zadtf + zadtt % 4, zadtae = zadtd - 1 - (zadtg + Math.floor(zadtt / 4));
            if (zadtad >= zadtc || zadtae < 0) continue;
            var zadtaf = (zadtae * zadtc + zadtad) * 4;
            zadte[zadtaf] = zadtv[0];
            zadte[zadtaf + 1] = zadtv[1];
            zadte[zadtaf + 2] = zadtv[2];
            zadte[zadtaf + 3] = zadtw;
        }
    };
    var zadts = 128;
    var zadtt = [];
    for (var zadtu = 0; zadtu < zadtg; zadtu++) {
        var zadtv = Math.max(1, zadtf >> zadtu), zadtw = Math.max(1, zadte >> zadtu);
        var zadtx = [];
        for (var zadty = 0; zadty < zadtn; zadty++) {
            var zadtz;
            if (zadto === "rgba") {
                zadtz = new Uint8Array(zadtv * zadtw * 4);
                for (var zadtaa = 0; zadtaa < zadtv * zadtw; zadtaa++) {
                    var zadtab = zadts + zadtaa * zadtp;
                    var zadtac = Math.floor(zadtaa / zadtv), zadtad = zadtaa % zadtv;
                    var zadtae = (zadtw - 1 - zadtac) * zadtv + zadtad;
                    var zadtaf = 0;
                    for (var zadtag = 0; zadtag < zadtp; zadtag++) zadtaf |= zadtb[zadtab + zadtag] << 8 * zadtag;
                    var zadtah = 0, zadtai = zadtl.r, zadtaj = 0;
                    zadtah = zadtai ? Math.round(Math.log2(zadtai & -zadtai)) : 0;
                    zadtaj = (zadtaf & zadtai) >> zadtah;
                    zadtz[zadtae * 4] = zadtai ? Math.round(zadtaj * 255 / (zadtai >> zadtah)) : 0;
                    zadtai = zadtl.g;
                    zadtah = zadtai ? Math.round(Math.log2(zadtai & -zadtai)) : 0;
                    zadtaj = (zadtaf & zadtai) >> zadtah;
                    zadtz[zadtae * 4 + 1] = zadtai ? Math.round(zadtaj * 255 / (zadtai >> zadtah)) : 0;
                    zadtai = zadtl.b;
                    zadtah = zadtai ? Math.round(Math.log2(zadtai & -zadtai)) : 0;
                    zadtaj = (zadtaf & zadtai) >> zadtah;
                    zadtz[zadtae * 4 + 2] = zadtai ? Math.round(zadtaj * 255 / (zadtai >> zadtah)) : 0;
                    zadtai = zadtl.a;
                    zadtah = zadtai ? Math.round(Math.log2(zadtai & -zadtai)) : 0;
                    zadtaj = (zadtaf & zadtai) >> zadtah;
                    zadtz[zadtae * 4 + 3] = zadtai ? Math.round(zadtaj * 255 / (zadtai >> zadtah)) : 255;
                }
                zadts += zadtv * zadtw * zadtp;
            } else {
                var zadtak = Math.max(1, Math.ceil(zadtv / 4)), zadtal = Math.max(1, Math.ceil(zadtw / 4));
                zadtz = new Uint8Array(zadtv * zadtw * 4);
                for (var zadtam = 0; zadtam < zadtal; zadtam++) for (var zadtan = 0; zadtan < zadtak; zadtan++) {
                    zadtr(zadtb, zadts + (zadtam * zadtak + zadtan) * zadtp, zadtv, zadtw, zadtz, zadtan * 4, zadtam * 4);
                }
                zadts += zadtak * zadtal * zadtp;
            }
            zadtx.push(zadtz);
        }
        zadtt.push({
            level: zadtu,
            width: zadtv,
            height: zadtw,
            slices: zadtn > 1 ? zadtx : null,
            data: zadtn === 1 ? zadtx[0] : null,
            compressed: false
        });
    }
    return {
        levels: zadtt,
        width: zadtf,
        height: zadte,
        target: zadtm ? "cubemap" : "2d",
        format: zadto,
        faces: zadtn,
        mipmaps: zadtg
    };
}

export { faoxomdecodedds };
