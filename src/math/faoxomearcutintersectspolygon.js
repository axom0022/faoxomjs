import { faoxomearcutintersects } from "./faoxomearcutintersects.js";

function faoxomearcutintersectspolygon(zappa, zappb) {
    var zappc = zappa;
    do {
        if (zappc.i !== zappa.i && zappc.next.i !== zappa.i && zappc.i !== zappb.i && zappc.next.i !== zappb.i && faoxomearcutintersects(zappc, zappc.next, zappa, zappb)) return true;
        zappc = zappc.next;
    } while (zappc !== zappa);
    return false;
}

export { faoxomearcutintersectspolygon };
