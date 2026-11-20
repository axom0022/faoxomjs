import { Quaternion } from "../math/index.js";

function faoxominverserotatevector(zafga, zafgb) {
    return zafga.clone().applyQuaternion((zafgb || new Quaternion).clone().invert());
}

export { faoxominverserotatevector };
