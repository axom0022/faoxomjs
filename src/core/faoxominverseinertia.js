import { faoxominverserotatevector } from "./faoxominverserotatevector.js";
import { faoxomrotatevector } from "./faoxomrotatevector.js";

function faoxominverseinertia(body, vector) { var local = faoxominverserotatevector(vector, body.rotation); local.x *= body.inverseInertiaLocal.x; local.y *= body.inverseInertiaLocal.y; local.z *= body.inverseInertiaLocal.z; return faoxomrotatevector(local, body.rotation); }

export { faoxominverseinertia };
