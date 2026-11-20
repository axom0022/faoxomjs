import { Quaternion } from "../math/index.js";

function faoxomlocalpoint(zafha, zafhb, zafhc) {
    return zafhc.clone().sub(zafha).applyQuaternion((zafhb || new Quaternion).clone().invert());
}

export { faoxomlocalpoint };
