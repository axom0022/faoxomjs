import { Quaternion } from "../math/index.js";

function faoxomrotatevector(vector, quaternion) { return vector.clone().applyQuaternion(quaternion || new Quaternion()); }

export { faoxomrotatevector };
