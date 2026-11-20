import { Quaternion } from "../math/index.js";

function faoxomrotatevector(zafua, zafub) {
    return zafua.clone().applyQuaternion(zafub || new Quaternion);
}

export { faoxomrotatevector };
