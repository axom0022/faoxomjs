import { faoxomvalue } from "../math/index.js";
import { SphereGeometry } from "./SphereGeometry.js";

class IcosahedronGeometry extends SphereGeometry { constructor(radius, detail) { super(radius, Math.max(3, 10 * (faoxomvalue(detail, 0) + 1)), Math.max(2, 6 * (faoxomvalue(detail, 0) + 1))); } }

export { IcosahedronGeometry };
