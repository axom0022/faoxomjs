import { faoxomearcutequals } from "./faoxomearcutequals.js";

import { faoxomearcutinsertnode } from "./faoxomearcutinsertnode.js";

import { faoxomearcutremovenode } from "./faoxomearcutremovenode.js";

import { faoxomearcutsignedarea } from "./faoxomearcutsignedarea.js";

function faoxomearcutlinkedlist(zapua, zapub, zapuc, zapud, zapue) {
    var zapuf, zapug;
    if (zapue === faoxomearcutsignedarea(zapua, zapub, zapuc, zapud) > 0) {
        for (zapug = zapub; zapug < zapuc; zapug += zapud) zapuf = faoxomearcutinsertnode(zapug / zapud | 0, zapua[zapug], zapua[zapug + 1], zapuf);
    } else {
        for (zapug = zapuc - zapud; zapug >= zapub; zapug -= zapud) zapuf = faoxomearcutinsertnode(zapug / zapud | 0, zapua[zapug], zapua[zapug + 1], zapuf);
    }
    if (zapuf && faoxomearcutequals(zapuf, zapuf.next)) {
        faoxomearcutremovenode(zapuf);
        zapuf = zapuf.next;
    }
    return zapuf;
}

export { faoxomearcutlinkedlist };
