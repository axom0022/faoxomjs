import { ShapePath } from "../math/index.js";

function faoxomfontcreatepath(zaewa, zaewb, zaewc, zaewd, zaewe) {
    var zaewf = zaewe.glyphs[zaewa] || zaewe.glyphs["?"];
    if (!zaewf) {
        console.error('Font: character "' + zaewa + '" does not exist in font family ' + (zaewe.familyName || "unknown") + ".");
        return {
            offsetX: 0,
            path: new ShapePath
        };
    }
    var zaewg = new ShapePath;
    var zaewh, zaewi, zaewj, zaewk, zaewl, zaewm, zaewn, zaewo;
    if (zaewf.o) {
        var zaewp = zaewf._cachedOutline || (zaewf._cachedOutline = zaewf.o.split(" "));
        var zaewq = 0, zaewr = zaewp.length;
        while (zaewq < zaewr) {
            var zaews = zaewp[zaewq++];
            switch (zaews) {
              case "m":
                zaewh = zaewp[zaewq++] * zaewb + zaewc;
                zaewi = zaewp[zaewq++] * zaewb + zaewd;
                zaewg.moveTo(zaewh, zaewi);
                break;

              case "l":
                zaewh = zaewp[zaewq++] * zaewb + zaewc;
                zaewi = zaewp[zaewq++] * zaewb + zaewd;
                zaewg.lineTo(zaewh, zaewi);
                break;

              case "q":
                zaewj = zaewp[zaewq++] * zaewb + zaewc;
                zaewk = zaewp[zaewq++] * zaewb + zaewd;
                zaewl = zaewp[zaewq++] * zaewb + zaewc;
                zaewm = zaewp[zaewq++] * zaewb + zaewd;
                zaewg.quadraticCurveTo(zaewl, zaewm, zaewj, zaewk);
                break;

              case "b":
                zaewj = zaewp[zaewq++] * zaewb + zaewc;
                zaewk = zaewp[zaewq++] * zaewb + zaewd;
                zaewl = zaewp[zaewq++] * zaewb + zaewc;
                zaewm = zaewp[zaewq++] * zaewb + zaewd;
                zaewn = zaewp[zaewq++] * zaewb + zaewc;
                zaewo = zaewp[zaewq++] * zaewb + zaewd;
                zaewg.bezierCurveTo(zaewl, zaewm, zaewn, zaewo, zaewj, zaewk);
                break;
            }
        }
    }
    return {
        offsetX: zaewf.ha * zaewb,
        path: zaewg
    };
}

export { faoxomfontcreatepath };
