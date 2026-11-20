import { faoxomvalue } from "../math/index.js";

import { Material } from "./Material.js";

class LineBasicMaterial extends Material {
    constructor(zanoa) {
        zanoa = zanoa || {};
        super(zanoa);
        this.type = "LineBasicMaterial";
        this.linewidth = faoxomvalue(zanoa.linewidth, 1);
    }
}

export { LineBasicMaterial };
