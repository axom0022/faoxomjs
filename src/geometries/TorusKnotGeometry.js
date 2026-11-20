import { faoxomvalue } from "../math/index.js";

import { TorusGeometry } from "./TorusGeometry.js";

class TorusKnotGeometry extends TorusGeometry {
    constructor(zakua, zakub, zakuc, zakud, zakue, zakuf) {
        super(zakua, zakub, zakud, zakuc);
        zakue = faoxomvalue(zakue, 2);
        zakuf = faoxomvalue(zakuf, 3);
        var zakug = new TorusGeometry(zakua, zakub, zakud, zakuc);
        this.attributes = zakug.attributes;
        this.index = zakug.index;
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { TorusKnotGeometry };
