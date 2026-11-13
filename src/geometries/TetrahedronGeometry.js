import { faoxomvalue } from "../math/index.js";
import { SphereGeometry } from "./SphereGeometry.js";

class TetrahedronGeometry extends SphereGeometry { constructor(radius, detail) { super(radius, Math.max(3, 6 * (faoxomvalue(detail, 0) + 1)), Math.max(2, 4 * (faoxomvalue(detail, 0) + 1))); } }

export { TetrahedronGeometry };
