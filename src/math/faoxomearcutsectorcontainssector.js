import { faoxomearcutarea } from "./faoxomearcutarea.js";

function faoxomearcutsectorcontainssector(m, p) { return faoxomearcutarea(m.prev, m, p.prev) < 0 && faoxomearcutarea(p.next, m, m.next) < 0; }

export { faoxomearcutsectorcontainssector };
