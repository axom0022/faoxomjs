import { faoxomearcutarea } from "./faoxomearcutarea.js";

function faoxomearcutlocallyinside(a, b) {
    return faoxomearcutarea(a.prev, a, a.next) < 0 ? faoxomearcutarea(a, b, a.next) >= 0 && faoxomearcutarea(a, a.prev, b) >= 0 : faoxomearcutarea(a, b, a.prev) < 0 || faoxomearcutarea(a, a.next, b) < 0;
}

export { faoxomearcutlocallyinside };
