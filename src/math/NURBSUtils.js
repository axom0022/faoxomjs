import { Vector4 } from "./Vector4.js";

class NURBSUtils {
    static findSpan(zaoja, zaojb, zaojc) {
        var zaojd = zaojc.length - zaoja - 2;
        if (zaojb >= zaojc[zaojd + 1]) return zaojd;
        if (zaojb <= zaojc[zaoja]) return zaoja;
        var zaoje = zaoja, zaojf = zaojd + 1, zaojg = Math.floor((zaoje + zaojf) / 2);
        while (zaojb < zaojc[zaojg] || zaojb >= zaojc[zaojg + 1]) {
            if (zaojb < zaojc[zaojg]) zaojf = zaojg; else zaoje = zaojg;
            zaojg = Math.floor((zaoje + zaojf) / 2);
        }
        return zaojg;
    }
    static calcBasisFunctions(zaoja, zaojb, zaojc, zaojd) {
        var zaoje = [ 1 ], zaojf = [ 0 ], zaojg = [ 0 ];
        for (var zaojh = 1; zaojh <= zaojc; zaojh++) {
            zaojf[zaojh] = zaojb - zaojd[zaoja + 1 - zaojh];
            zaojg[zaojh] = zaojd[zaoja + zaojh] - zaojb;
            var zaoji = 0;
            for (var zaojj = 0; zaojj < zaojh; zaojj++) {
                var zaojk = zaojg[zaojj + 1], zaojl = zaojf[zaojh - zaojj];
                var zaojm = zaoje[zaojj] / (zaojk + zaojl);
                zaoje[zaojj] = zaoji + zaojk * zaojm;
                zaoji = zaojl * zaojm;
            }
            zaoje[zaojh] = zaoji;
        }
        return zaoje;
    }
    static calcBSplinePoint(zaoja, zaojb, zaojc, zaojd) {
        var zaoje = this.findSpan(zaoja, zaojd, zaojb), zaojf = this.calcBasisFunctions(zaoje, zaojd, zaoja, zaojb), zaojg = new Vector4(0, 0, 0, 0);
        for (var zaojh = 0; zaojh <= zaoja; zaojh++) {
            var zaoji = zaojc[zaoje - zaoja + zaojh], zaojj = zaojf[zaojh];
            zaojg.x += zaojj * zaoji.x;
            zaojg.y += zaojj * zaoji.y;
            zaojg.z += zaojj * zaoji.z;
            zaojg.w += zaojj * (zaoji.w !== undefined ? zaoji.w : 1);
        }
        return zaojg;
    }
}

export { NURBSUtils };
