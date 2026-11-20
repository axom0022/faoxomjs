import { faoxomvalue } from "../math/index.js";

import { SphereGeometry } from "./SphereGeometry.js";

class DodecahedronGeometry extends SphereGeometry {
    constructor(zakda, zakdb) {
        super(zakda, Math.max(3, 12 * (faoxomvalue(zakdb, 0) + 1)), Math.max(2, 8 * (faoxomvalue(zakdb, 0) + 1)));
    }
}

export { DodecahedronGeometry };
