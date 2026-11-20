import { faoxomearcutsortlinked } from "./faoxomearcutsortlinked.js";

import { faoxomearcutzorder } from "./faoxomearcutzorder.js";

function faoxomearcutindexcurve(zapma, zapmb, zapmc, zapmd) {
    var zapme = zapma;
    do {
        if (zapme.z === 0) zapme.z = faoxomearcutzorder(zapme.x, zapme.y, zapmb, zapmc, zapmd);
        zapme.prevZ = zapme.prev;
        zapme.nextZ = zapme.next;
        zapme = zapme.next;
    } while (zapme !== zapma);
    zapme.prevZ.nextZ = null;
    zapme.prevZ = null;
    faoxomearcutsortlinked(zapme);
}

export { faoxomearcutindexcurve };
