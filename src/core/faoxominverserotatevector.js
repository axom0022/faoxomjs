import { Quaternion } from "../math/index.js";

function faoxominverserotatevector(vector, quaternion) { return vector.clone().applyQuaternion((quaternion || new Quaternion()).clone().invert()); }

export { faoxominverserotatevector };
