import { Color, faoxomvalue } from "../math/index.js";

import { Light } from "./Light.js";

class HemisphereLight extends Light {
    constructor(zalla, zallb, zallc) {
        super(zalla, zallc);
        this.type = "HemisphereLight";
        this.groundColor = new Color(faoxomvalue(zallb, 4473924));
    }
}

export { HemisphereLight };
