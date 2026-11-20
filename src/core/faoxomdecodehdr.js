function faoxomdecodehdr(zadva) {
    var zadvb = zadva instanceof Uint8Array ? zadva : new Uint8Array(zadva);
    var zadvc = "", zadvd = 0;
    while (zadvd < zadvb.length) {
        var zadve = zadvd;
        while (zadve < zadvb.length && zadvb[zadve] !== 10) zadve++;
        var zadvf = String.fromCharCode.apply(null, zadvb.subarray(zadvd, zadve)).trim();
        zadvd = zadve + 1;
        if (!zadvf.length) {
            if (zadvd < zadvb.length) {
                var zadvg = zadvd;
                while (zadvg < zadvb.length && zadvb[zadvg] !== 10) zadvg++;
                zadvc += String.fromCharCode.apply(null, zadvb.subarray(zadvd, zadvg)).trim() + "\n";
                zadvd = zadvg + 1;
            }
            break;
        }
        zadvc += zadvf + "\n";
    }
    if (zadvc.indexOf("#?") !== 0) throw new Error("Not a Radiance HDR file");
    var zadvh = zadvc.match(/-Y\s+(\d+)\s+\+X\s+(\d+)/);
    var zadvi = false, zadvj = 0, zadvk = 0;
    if (zadvh) {
        zadvj = parseInt(zadvh[1], 10);
        zadvk = parseInt(zadvh[2], 10);
    } else {
        zadvh = zadvc.match(/([+-])Y\s+(\d+)\s+([+-])X\s+(\d+)/);
        if (!zadvh) throw new Error("HDR file has no resolution line");
        zadvi = zadvh[1] === "+";
        zadvj = parseInt(zadvh[2], 10);
        zadvk = parseInt(zadvh[4], 10);
    }
    var zadvl = new Float32Array(zadvk * zadvj * 4);
    var zadvm = function(zadva, zadvc) {
        var zadvd = zadvb[zadva + 3];
        if (zadvd === 0) {
            zadvl[zadvc] = 0;
            zadvl[zadvc + 1] = 0;
            zadvl[zadvc + 2] = 0;
        } else {
            var zadve = Math.pow(2, zadvd - 128) / 255;
            zadvl[zadvc] = zadvb[zadva] * zadve;
            zadvl[zadvc + 1] = zadvb[zadva + 1] * zadve;
            zadvl[zadvc + 2] = zadvb[zadva + 2] * zadve;
        }
        zadvl[zadvc + 3] = 1;
    };
    for (var zadvn = 0; zadvn < zadvj; zadvn++) {
        var zadvo = zadvi ? zadvj - 1 - zadvn : zadvn;
        var zadvp = zadvo * zadvk * 4;
        if (zadvk < 8 || zadvk > 32767 || zadvb[zadvd] !== 2 || zadvb[zadvd + 1] !== 2 || (zadvb[zadvd + 2] << 8 | zadvb[zadvd + 3]) !== zadvk) {
            for (var zadvq = 0; zadvq < zadvk; zadvq++) {
                zadvm(zadvd, zadvp + zadvq * 4);
                zadvd += 4;
            }
            continue;
        }
        zadvd += 4;
        var zadvr = zadvk + 127 >> 7;
        var zadvs = [];
        for (var zadvt = 0; zadvt < zadvr; zadvt++) zadvs.push(zadvb[zadvd + zadvt] + 1);
        zadvd += zadvr;
        var zadvu = [];
        for (var zadvv = 0; zadvv < 4; zadvv++) {
            var zadvw = new Uint8Array(zadvk), zadvx = 0;
            for (var zadvy = 0; zadvy < zadvr; zadvy++) {
                var zadvz = zadvs[zadvy];
                for (var zadvaa = 0; zadvaa < zadvz; zadvaa++) zadvw[zadvx++] = zadvb[zadvd++];
            }
            zadvu.push(zadvw);
        }
        for (var zadvab = 0; zadvab < zadvk; zadvab++) {
            var zadvac = [ zadvu[0][zadvab], zadvu[1][zadvab], zadvu[2][zadvab], zadvu[3][zadvab] ];
            var zadvad = zadvac[3];
            if (zadvad === 0) {
                zadvl[zadvp + zadvab * 4] = 0;
                zadvl[zadvp + zadvab * 4 + 1] = 0;
                zadvl[zadvp + zadvab * 4 + 2] = 0;
            } else {
                var zadvae = Math.pow(2, zadvad - 128) / 255;
                zadvl[zadvp + zadvab * 4] = zadvac[0] * zadvae;
                zadvl[zadvp + zadvab * 4 + 1] = zadvac[1] * zadvae;
                zadvl[zadvp + zadvab * 4 + 2] = zadvac[2] * zadvae;
            }
            zadvl[zadvp + zadvab * 4 + 3] = 1;
        }
    }
    return {
        data: zadvl,
        width: zadvk,
        height: zadvj
    };
}

export { faoxomdecodehdr };
