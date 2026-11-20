import { faoxomvalue } from "../math/index.js";

import { BasicMaterial } from "./BasicMaterial.js";

class LineMaterial extends BasicMaterial {
    constructor(zanpa) {
        zanpa = zanpa || {};
        super(zanpa);
        this.type = "LineMaterial";
        this.width = faoxomvalue(zanpa.width, .05);
        this.side = "double";
    }
}

export { LineMaterial };
