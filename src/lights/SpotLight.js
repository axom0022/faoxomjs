import { PerspectiveCamera } from "../camera/index.js";

import { Object3D } from "../core/index.js";

import { Matrix4, faoxomvalue } from "../math/index.js";

import { Light } from "./Light.js";

class SpotLight extends Light {
    constructor(zalsa, zalsb, zalsc, zalsd, zalse, zalsf) {
        super(zalsa, zalsb);
        this.type = "SpotLight";
        this.distance = faoxomvalue(zalsc, 0);
        this.angle = faoxomvalue(zalsd, Math.PI / 3);
        this.penumbra = faoxomvalue(zalse, 0);
        this.decay = faoxomvalue(zalsf, 2);
        this.target = new Object3D;
        this.shadow = {
            enabled: false,
            mapSize: 1024,
            camera: new PerspectiveCamera(50, 1, .1, 100),
            bias: 5e-4,
            map: null,
            matrix: new Matrix4,
            contactShadows: false,
            contactShadowDistance: 10,
            contactShadowStrength: .5
        };
    }
}

export { SpotLight };
