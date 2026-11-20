import { faoxomearcutarea } from "./faoxomearcutarea.js";

function faoxomearcutlocallyinside(zapva, zapvb) {
    return faoxomearcutarea(zapva.prev, zapva, zapva.next) < 0 ? faoxomearcutarea(zapva, zapvb, zapva.next) >= 0 && faoxomearcutarea(zapva, zapva.prev, zapvb) >= 0 : faoxomearcutarea(zapva, zapvb, zapva.prev) < 0 || faoxomearcutarea(zapva, zapva.next, zapvb) < 0;
}

export { faoxomearcutlocallyinside };
