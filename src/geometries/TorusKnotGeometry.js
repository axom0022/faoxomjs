import { faoxomvalue } from "../math/index.js";
import { TorusGeometry } from "./TorusGeometry.js";

class TorusKnotGeometry extends TorusGeometry { constructor(radius, tube, tubularSegments, radialSegments, p, q) { super(radius, tube, radialSegments, tubularSegments); p = faoxomvalue(p, 2); q = faoxomvalue(q, 3); var base = new TorusGeometry(radius, tube, radialSegments, tubularSegments); this.attributes = base.attributes; this.index = base.index; this.computeBoundingBox(); this.computeBoundingSphere(); } }

export { TorusKnotGeometry };
