import { faoxomfontcreatepath } from "./faoxomfontcreatepath.js";

function faoxomfontcreatepaths(zaexa, zaexb, zaexc, zaexd) {
    var zaexe = Array.from(String(zaexa));
    var zaexf = zaexb / (zaexc.resolution || 1e3);
    var zaexg = zaexc.boundingBox || {
        yMin: 0,
        yMax: 0
    };
    var zaexh = zaexc.underlineThickness !== undefined ? zaexc.underlineThickness : 0;
    var zaexi = (zaexg.yMax - zaexg.yMin + zaexh) * zaexf;
    var zaexj = [];
    var zaexk = 0, zaexl = 0;
    if (zaexd == "rtl" || zaexd == "tb") zaexe.reverse();
    for (var zaexm = 0; zaexm < zaexe.length; zaexm++) {
        var zaexn = zaexe[zaexm];
        if (zaexn === "\n") {
            zaexk = 0;
            zaexl -= zaexi;
        } else {
            var zaexo = faoxomfontcreatepath(zaexn, zaexf, zaexk, zaexl, zaexc);
            if (zaexd == "tb") {
                zaexk = 0;
                zaexl += (zaexc.ascender || 0) * zaexf;
            } else {
                zaexk += zaexo.offsetX;
            }
            zaexj.push(zaexo.path);
        }
    }
    return zaexj;
}

export { faoxomfontcreatepaths };
