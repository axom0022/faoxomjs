import { Object3D } from "../core/index.js";

import { Color, faoxomvalue } from "../math/index.js";

class Light extends Object3D {
    constructor(zaloa, zalob) {
        super();
        this.type = "Light";
        this.color = new Color(faoxomvalue(zaloa, 16777215));
        this.intensity = faoxomvalue(zalob, 1);
        this.castShadow = false;
    }
}

export { Light };
