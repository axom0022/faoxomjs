import { Vector3 } from "../math/index.js";

import { faoxominverseinertia } from "./faoxominverseinertia.js";

function faoxomeffectivemass(zadya, zadyb, zadyc) {
    if (zadya.isStatic) return 0;
    var zadyd = (new Vector3).subVectors(zadyc, zadya.position);
    var zadye = faoxominverseinertia(zadya, (new Vector3).crossVectors(zadyd, zadyb));
    return zadya.inverseMass + (new Vector3).crossVectors(zadye, zadyd).dot(zadyb);
}

export { faoxomeffectivemass };
