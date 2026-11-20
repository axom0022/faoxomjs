import { faoxomearcutarea } from "./faoxomearcutarea.js";

function faoxomearcutsectorcontainssector(zaqba, zaqbb) {
    return faoxomearcutarea(zaqba.prev, zaqba, zaqbb.prev) < 0 && faoxomearcutarea(zaqbb.next, zaqba, zaqba.next) < 0;
}

export { faoxomearcutsectorcontainssector };
