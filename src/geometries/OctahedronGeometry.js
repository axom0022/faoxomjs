import { faoxomvalue } from "../math/index.js";

import { SphereGeometry } from "./SphereGeometry.js";

class OctahedronGeometry extends SphereGeometry {
    constructor(zakla, zaklb) {
        super(zakla, Math.max(3, 8 * (faoxomvalue(zaklb, 0) + 1)), Math.max(2, 4 * (faoxomvalue(zaklb, 0) + 1)));
    }
}

export { OctahedronGeometry };
