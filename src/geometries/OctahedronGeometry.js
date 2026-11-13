import { faoxomvalue } from "../math/index.js";
import { SphereGeometry } from "./SphereGeometry.js";

class OctahedronGeometry extends SphereGeometry { constructor(radius, detail) { super(radius, Math.max(3, 8 * (faoxomvalue(detail, 0) + 1)), Math.max(2, 4 * (faoxomvalue(detail, 0) + 1))); } }

export { OctahedronGeometry };
