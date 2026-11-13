import { Quaternion } from "../math/index.js";

function faoxomlocalpoint(position, rotation, world) { return world.clone().sub(position).applyQuaternion((rotation || new Quaternion()).clone().invert()); }

export { faoxomlocalpoint };
