import { Matrix4, faoxomvalue } from "../math/index.js";

import { Light } from "./Light.js";

class PointLight extends Light {
    constructor(zalqa, zalqb, zalqc, zalqd) {
        super(zalqa, zalqb);
        this.type = "PointLight";
        this.distance = faoxomvalue(zalqc, 0);
        this.decay = faoxomvalue(zalqd, 2);
        this.shadow = {
            enabled: false,
            mapSize: 512,
            camera: {
                near: .1,
                far: zalqc || 100
            },
            bias: .002,
            cubeMap: null,
            matrix: new Matrix4,
            contactShadows: false,
            contactShadowDistance: 10,
            contactShadowStrength: .5
        };
    }
}

export { PointLight };
