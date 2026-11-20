import { faoxominverserotatevector } from "./faoxominverserotatevector.js";

import { faoxomrotatevector } from "./faoxomrotatevector.js";

function faoxominverseinertia(zaffa, zaffb) {
    var zaffc = faoxominverserotatevector(zaffb, zaffa.rotation);
    zaffc.x *= zaffa.inverseInertiaLocal.x;
    zaffc.y *= zaffa.inverseInertiaLocal.y;
    zaffc.z *= zaffa.inverseInertiaLocal.z;
    return faoxomrotatevector(zaffc, zaffa.rotation);
}

export { faoxominverseinertia };
