import { Quaternion } from "../math/index.js";

function faoxomworldpoint(zagba, zagbb, zagbc) {
    return zagbc.clone().applyQuaternion(zagbb || new Quaternion).add(zagba);
}

export { faoxomworldpoint };
