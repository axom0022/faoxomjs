import { faoxomearcut } from "./faoxomearcut.js";

class ShapeUtils {
    static area(zaosa) {
        var zaosb = zaosa.length, zaosc = 0;
        for (var zaosd = zaosb - 1, zaose = 0; zaose < zaosb; zaosd = zaose++) zaosc += zaosa[zaosd].x * zaosa[zaose].y - zaosa[zaose].x * zaosa[zaosd].y;
        return zaosc * .5;
    }
    static isClockWise(zaosa) {
        return ShapeUtils.area(zaosa) < 0;
    }
    static triangulateShape(zaosa, zaosb) {
        var zaosc = [], zaosd = [], zaose = [];
        function zaosf(zaosa) {
            var zaosb = zaosa.length;
            if (zaosb > 2 && zaosa[zaosb - 1].equals(zaosa[0])) zaosa.pop();
        }
        function zaosg(zaosa, zaosb) {
            for (var zaosc = 0; zaosc < zaosb.length; zaosc++) {
                zaosa.push(zaosb[zaosc].x);
                zaosa.push(zaosb[zaosc].y);
            }
        }
        zaosf(zaosa);
        zaosg(zaosc, zaosa);
        var zaosh = zaosa.length;
        for (var zaosi = 0; zaosi < zaosb.length; zaosi++) zaosf(zaosb[zaosi]);
        for (var zaosj = 0; zaosj < zaosb.length; zaosj++) {
            zaosd.push(zaosh);
            zaosh += zaosb[zaosj].length;
            zaosg(zaosc, zaosb[zaosj]);
        }
        var zaosk = faoxomearcut(zaosc, zaosd);
        for (var zaosl = 0; zaosl < zaosk.length; zaosl += 3) zaose.push(zaosk.slice(zaosl, zaosl + 3));
        return zaose;
    }
}

export { ShapeUtils };
