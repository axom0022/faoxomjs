import { faoxomvalue } from "../math/index.js";

import { SphereGeometry } from "./SphereGeometry.js";

class TetrahedronGeometry extends SphereGeometry {
    constructor(zakra, zakrb) {
        super(zakra, Math.max(3, 6 * (faoxomvalue(zakrb, 0) + 1)), Math.max(2, 4 * (faoxomvalue(zakrb, 0) + 1)));
    }
}

export { TetrahedronGeometry };
