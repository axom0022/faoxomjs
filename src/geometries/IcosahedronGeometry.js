import { faoxomvalue } from "../math/index.js";

import { SphereGeometry } from "./SphereGeometry.js";

class IcosahedronGeometry extends SphereGeometry {
    constructor(zakia, zakib) {
        super(zakia, Math.max(3, 10 * (faoxomvalue(zakib, 0) + 1)), Math.max(2, 6 * (faoxomvalue(zakib, 0) + 1)));
    }
}

export { IcosahedronGeometry };
