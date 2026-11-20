function faoxomresolve(zafta, zaftb) {
    var zaftc = zaftb.split(".");
    var zaftd = zafta;
    for (var zafte = 0; zafte < zaftc.length - 1; zafte++) {
        if (!zaftd) break;
        if (zaftd[zaftc[zafte]] !== undefined) zaftd = zaftd[zaftc[zafte]]; else if (zaftd.getObjectByName) zaftd = zaftd.getObjectByName(zaftc[zafte]); else zaftd = null;
    }
    return {
        object: zaftd,
        key: zaftc[zaftc.length - 1]
    };
}

export { faoxomresolve };
