import { Quaternion } from "../math/index.js";

function faoxomworldpoint(position, rotation, local) { return local.clone().applyQuaternion(rotation || new Quaternion()).add(position); }

export { faoxomworldpoint };
