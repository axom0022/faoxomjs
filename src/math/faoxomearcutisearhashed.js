import { faoxomearcutarea } from "./faoxomearcutarea.js";

import { faoxomearcutpointintriangleexceptfirst } from "./faoxomearcutpointintriangleexceptfirst.js";

import { faoxomearcutzorder } from "./faoxomearcutzorder.js";

function faoxomearcutisearhashed(zapra, zaprb, zaprc, zaprd) {
    var zapre = zapra.prev, zaprf = zapra, zaprg = zapra.next;
    if (faoxomearcutarea(zapre, zaprf, zaprg) >= 0) return false;
    var zaprh = zapre.x, zapri = zaprf.x, zaprj = zaprg.x, zaprk = zapre.y, zaprl = zaprf.y, zaprm = zaprg.y;
    var zaprn = Math.min(zaprh, zapri, zaprj), zapro = Math.min(zaprk, zaprl, zaprm), zaprp = Math.max(zaprh, zapri, zaprj), zaprq = Math.max(zaprk, zaprl, zaprm);
    var zaprr = faoxomearcutzorder(zaprn, zapro, zaprb, zaprc, zaprd), zaprs = faoxomearcutzorder(zaprp, zaprq, zaprb, zaprc, zaprd);
    var zaprt = zapra.prevZ, zapru = zapra.nextZ;
    while (zaprt && zaprt.z >= zaprr && zapru && zapru.z <= zaprs) {
        if (zaprt.x >= zaprn && zaprt.x <= zaprp && zaprt.y >= zapro && zaprt.y <= zaprq && zaprt !== zapre && zaprt !== zaprg && faoxomearcutpointintriangleexceptfirst(zaprh, zaprk, zapri, zaprl, zaprj, zaprm, zaprt.x, zaprt.y) && faoxomearcutarea(zaprt.prev, zaprt, zaprt.next) >= 0) return false;
        zaprt = zaprt.prevZ;
        if (zapru.x >= zaprn && zapru.x <= zaprp && zapru.y >= zapro && zapru.y <= zaprq && zapru !== zapre && zapru !== zaprg && faoxomearcutpointintriangleexceptfirst(zaprh, zaprk, zapri, zaprl, zaprj, zaprm, zapru.x, zapru.y) && faoxomearcutarea(zapru.prev, zapru, zapru.next) >= 0) return false;
        zapru = zapru.nextZ;
    }
    while (zaprt && zaprt.z >= zaprr) {
        if (zaprt.x >= zaprn && zaprt.x <= zaprp && zaprt.y >= zapro && zaprt.y <= zaprq && zaprt !== zapre && zaprt !== zaprg && faoxomearcutpointintriangleexceptfirst(zaprh, zaprk, zapri, zaprl, zaprj, zaprm, zaprt.x, zaprt.y) && faoxomearcutarea(zaprt.prev, zaprt, zaprt.next) >= 0) return false;
        zaprt = zaprt.prevZ;
    }
    while (zapru && zapru.z <= zaprs) {
        if (zapru.x >= zaprn && zapru.x <= zaprp && zapru.y >= zapro && zapru.y <= zaprq && zapru !== zapre && zapru !== zaprg && faoxomearcutpointintriangleexceptfirst(zaprh, zaprk, zapri, zaprl, zaprj, zaprm, zapru.x, zapru.y) && faoxomearcutarea(zapru.prev, zapru, zapru.next) >= 0) return false;
        zapru = zapru.nextZ;
    }
    return true;
}

export { faoxomearcutisearhashed };
