function faoxomdecodetga(zadwa) {
    var zadwb = zadwa instanceof Uint8Array ? zadwa : new Uint8Array(zadwa);
    if (zadwb.length < 18) throw new Error("TGA header missing");
    var zadwc = zadwb[0], zadwd = zadwb[1], zadwe = zadwb[2];
    var zadwf = zadwb[3] | zadwb[4] << 8, zadwg = zadwb[5] | zadwb[6] << 8, zadwh = zadwb[7];
    var zadwi = zadwb[12] | zadwb[13] << 8, zadwj = zadwb[14] | zadwb[15] << 8;
    var zadwk = zadwb[16], zadwl = zadwb[17];
    var zadwm = zadwe === 9 || zadwe === 10 || zadwe === 11;
    var zadwn = zadwe === 1 || zadwe === 9;
    var zadwo = zadwe === 3 || zadwe === 11;
    if (zadwe !== 1 && zadwe !== 2 && zadwe !== 3 && zadwe !== 9 && zadwe !== 10 && zadwe !== 11) throw new Error("Unsupported TGA image type " + zadwe);
    if (zadwn && zadwd !== 1) throw new Error("Colormapped TGA without a color map");
    if (!zadwn && zadwd === 1) throw new Error("Unexpected TGA color map on unmapped image");
    var zadwp = 18 + zadwc;
    var zadwq = null;
    if (zadwd === 1) {
        var zadwr = Math.max(1, zadwh >> 3);
        zadwq = new Uint8Array(zadwg * 4);
        for (var zadws = 0; zadws < zadwg; zadws++) {
            var zadwt = zadwp + zadws * zadwr;
            if (zadwr === 4) {
                zadwq[zadws * 4] = zadwb[zadwt + 2];
                zadwq[zadws * 4 + 1] = zadwb[zadwt + 1];
                zadwq[zadws * 4 + 2] = zadwb[zadwt];
                zadwq[zadws * 4 + 3] = zadwb[zadwt + 3];
            } else if (zadwr === 3) {
                zadwq[zadws * 4] = zadwb[zadwt + 2];
                zadwq[zadws * 4 + 1] = zadwb[zadwt + 1];
                zadwq[zadws * 4 + 2] = zadwb[zadwt];
                zadwq[zadws * 4 + 3] = 255;
            } else if (zadwr === 2) {
                var zadwu = zadwb[zadwt] | zadwb[zadwt + 1] << 8;
                zadwq[zadws * 4] = (zadwu >> 10 & 31) * 255 / 31;
                zadwq[zadws * 4 + 1] = (zadwu >> 5 & 63) * 255 / 63;
                zadwq[zadws * 4 + 2] = (zadwu & 31) * 255 / 31;
                zadwq[zadws * 4 + 3] = zadwu >> 15 ? 0 : 255;
            } else {
                zadwq[zadws * 4] = zadwb[zadwt];
                zadwq[zadws * 4 + 1] = zadwb[zadwt];
                zadwq[zadws * 4 + 2] = zadwb[zadwt];
                zadwq[zadws * 4 + 3] = 255;
            }
        }
        zadwp += zadwg * zadwr;
    }
    var zadwv = zadwo ? 1 : Math.max(1, zadwk >> 3);
    if (!zadwo && !zadwn && zadwk !== 16 && zadwk !== 24 && zadwk !== 32) throw new Error("Unsupported TGA depth " + zadwk);
    if (zadwn && zadwv !== 1 && zadwv !== 2) throw new Error("Unsupported TGA colormap index size");
    var zadww = zadwi * zadwj;
    var zadwx = new Uint8Array(zadww * zadwv);
    if (zadwm) {
        var zadwy = 0;
        while (zadwy < zadwx.length && zadwp < zadwb.length) {
            var zadwz = zadwb[zadwp++];
            var zadwaa = (zadwz & 127) + 1;
            if (zadwy + zadwaa * zadwv > zadwx.length) zadwaa = Math.floor((zadwx.length - zadwy) / zadwv);
            if (zadwz & 128) {
                for (var zadwab = 0; zadwab < zadwaa; zadwab++) for (var zadwac = 0; zadwac < zadwv; zadwac++) zadwx[zadwy++] = zadwb[zadwp + zadwac];
                zadwp += zadwv;
            } else {
                for (var zadwad = 0; zadwad < zadwaa; zadwad++) for (var zadwae = 0; zadwae < zadwv; zadwae++) zadwx[zadwy++] = zadwp < zadwb.length ? zadwb[zadwp++] : 0;
            }
        }
    } else {
        var zadwaf = Math.min(zadwx.length, zadwb.length - zadwp);
        for (var zadwag = 0; zadwag < zadwaf; zadwag++) zadwx[zadwag] = zadwb[zadwp + zadwag];
    }
    var zadwah = new Uint8Array(zadww * 4);
    for (var zadwai = 0; zadwai < zadww; zadwai++) {
        var zadwaj = zadwai * zadwv;
        if (zadwn) {
            var zadwak = (zadwx[zadwaj] | (zadwv === 2 ? zadwx[zadwaj + 1] << 8 : 0)) - zadwf;
            if (zadwak >= 0 && zadwak < zadwg) {
                zadwah[zadwai * 4] = zadwq[zadwak * 4];
                zadwah[zadwai * 4 + 1] = zadwq[zadwak * 4 + 1];
                zadwah[zadwai * 4 + 2] = zadwq[zadwak * 4 + 2];
                zadwah[zadwai * 4 + 3] = zadwq[zadwak * 4 + 3];
            } else {
                zadwah[zadwai * 4] = 0;
                zadwah[zadwai * 4 + 1] = 0;
                zadwah[zadwai * 4 + 2] = 0;
                zadwah[zadwai * 4 + 3] = 255;
            }
        } else if (zadwo) {
            zadwah[zadwai * 4] = zadwx[zadwaj];
            zadwah[zadwai * 4 + 1] = zadwx[zadwaj];
            zadwah[zadwai * 4 + 2] = zadwx[zadwaj];
            zadwah[zadwai * 4 + 3] = 255;
        } else if (zadwv === 2) {
            var zadwal = zadwx[zadwaj] | zadwx[zadwaj + 1] << 8;
            zadwah[zadwai * 4] = (zadwal >> 10 & 31) * 255 / 31;
            zadwah[zadwai * 4 + 1] = (zadwal >> 5 & 63) * 255 / 63;
            zadwah[zadwai * 4 + 2] = (zadwal & 31) * 255 / 31;
            zadwah[zadwai * 4 + 3] = zadwal >> 15 ? 0 : 255;
        } else if (zadwv === 3) {
            zadwah[zadwai * 4] = zadwx[zadwaj + 2];
            zadwah[zadwai * 4 + 1] = zadwx[zadwaj + 1];
            zadwah[zadwai * 4 + 2] = zadwx[zadwaj];
            zadwah[zadwai * 4 + 3] = 255;
        } else {
            zadwah[zadwai * 4] = zadwx[zadwaj + 2];
            zadwah[zadwai * 4 + 1] = zadwx[zadwaj + 1];
            zadwah[zadwai * 4 + 2] = zadwx[zadwaj];
            zadwah[zadwai * 4 + 3] = zadwx[zadwaj + 3];
        }
    }
    var zadwam = (zadwl & 32) !== 0;
    var zadwan = (zadwl & 16) !== 0;
    if (zadwam || zadwan) {
        var zadwao = new Uint8Array(zadww * 4);
        for (var zadwap = 0; zadwap < zadwj; zadwap++) for (var zadwaq = 0; zadwaq < zadwi; zadwaq++) {
            var zadwar = zadwam ? zadwj - 1 - zadwap : zadwap, zadwas = zadwan ? zadwi - 1 - zadwaq : zadwaq;
            var zadwat = (zadwar * zadwi + zadwas) * 4, zadwau = (zadwap * zadwi + zadwaq) * 4;
            zadwao[zadwau] = zadwah[zadwat];
            zadwao[zadwau + 1] = zadwah[zadwat + 1];
            zadwao[zadwau + 2] = zadwah[zadwat + 2];
            zadwao[zadwau + 3] = zadwah[zadwat + 3];
        }
        zadwah = zadwao;
    }
    return {
        data: zadwah,
        width: zadwi,
        height: zadwj
    };
}

export { faoxomdecodetga };
