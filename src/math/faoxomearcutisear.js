import { faoxomearcutarea } from "./faoxomearcutarea.js";

import { faoxomearcutpointintriangleexceptfirst } from "./faoxomearcutpointintriangleexceptfirst.js";

function faoxomearcutisear(zapqa) {
    var zapqb = zapqa.prev, zapqc = zapqa, zapqd = zapqa.next;
    if (faoxomearcutarea(zapqb, zapqc, zapqd) >= 0) return false;
    var zapqe = zapqb.x, zapqf = zapqc.x, zapqg = zapqd.x, zapqh = zapqb.y, zapqi = zapqc.y, zapqj = zapqd.y;
    var zapqk = Math.min(zapqe, zapqf, zapqg), zapql = Math.min(zapqh, zapqi, zapqj), zapqm = Math.max(zapqe, zapqf, zapqg), zapqn = Math.max(zapqh, zapqi, zapqj);
    var zapqo = zapqd.next;
    while (zapqo !== zapqb) {
        if (zapqo.x >= zapqk && zapqo.x <= zapqm && zapqo.y >= zapql && zapqo.y <= zapqn && faoxomearcutpointintriangleexceptfirst(zapqe, zapqh, zapqf, zapqi, zapqg, zapqj, zapqo.x, zapqo.y) && faoxomearcutarea(zapqo.prev, zapqo, zapqo.next) >= 0) return false;
        zapqo = zapqo.next;
    }
    return true;
}

export { faoxomearcutisear };
