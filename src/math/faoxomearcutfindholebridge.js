import { faoxomearcutequals } from "./faoxomearcutequals.js";

import { faoxomearcutlocallyinside } from "./faoxomearcutlocallyinside.js";

import { faoxomearcutpointintriangle } from "./faoxomearcutpointintriangle.js";

import { faoxomearcutsectorcontainssector } from "./faoxomearcutsectorcontainssector.js";

function faoxomearcutfindholebridge(zapka, zapkb) {
    var zapkc = zapkb;
    var zapkd = zapka.x, zapke = zapka.y;
    var zapkf = -Infinity, zapkg;
    if (faoxomearcutequals(zapka, zapkc)) return zapkc;
    do {
        if (faoxomearcutequals(zapka, zapkc.next)) return zapkc.next; else if (zapke <= zapkc.y && zapke >= zapkc.next.y && zapkc.next.y !== zapkc.y) {
            var zapkh = zapkc.x + (zapke - zapkc.y) * (zapkc.next.x - zapkc.x) / (zapkc.next.y - zapkc.y);
            if (zapkh <= zapkd && zapkh > zapkf) {
                zapkf = zapkh;
                zapkg = zapkc.x < zapkc.next.x ? zapkc : zapkc.next;
                if (zapkh === zapkd) return zapkg;
            }
        }
        zapkc = zapkc.next;
    } while (zapkc !== zapkb);
    if (!zapkg) return null;
    var zapki = zapkg;
    var zapkj = zapkg.x, zapkk = zapkg.y;
    var zapkl = Infinity;
    zapkc = zapkg;
    do {
        if (zapkd >= zapkc.x && zapkc.x >= zapkj && zapkd !== zapkc.x && faoxomearcutpointintriangle(zapke < zapkk ? zapkd : zapkf, zapke, zapkj, zapkk, zapke < zapkk ? zapkf : zapkd, zapke, zapkc.x, zapkc.y)) {
            var zapkm = Math.abs(zapke - zapkc.y) / (zapkd - zapkc.x);
            if (faoxomearcutlocallyinside(zapkc, zapka) && (zapkm < zapkl || zapkm === zapkl && (zapkc.x > zapkg.x || zapkc.x === zapkg.x && faoxomearcutsectorcontainssector(zapkg, zapkc)))) {
                zapkg = zapkc;
                zapkl = zapkm;
            }
        }
        zapkc = zapkc.next;
    } while (zapkc !== zapki);
    return zapkg;
}

export { faoxomearcutfindholebridge };
