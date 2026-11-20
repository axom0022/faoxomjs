import { faoxomvalue } from "../math/index.js";

import { Material } from "./Material.js";

class PointsMaterial extends Material {
    constructor(zanta) {
        zanta = zanta || {};
        super(zanta);
        this.type = "PointsMaterial";
        this.size = faoxomvalue(zanta.size, 1);
        this.sizeAttenuation = zanta.sizeAttenuation !== false;
    }
}

export { PointsMaterial };
