import { SphereGeometry } from "../geometries/index.js";

import { BasicMaterial } from "../materials/index.js";

import { Mesh } from "../objects/index.js";

class PointLightHelper extends Mesh {
    constructor(zalca, zalcb, zalcc) {
        super(new SphereGeometry(zalcb || .5, 8, 4), new BasicMaterial({
            color: zalcc || (zalca.color ? zalca.color.getHex() : 16776960),
            wireframe: true
        }));
        this.light = zalca;
    }
    update() {
        if (this.light) this.position.copy(this.light.position);
    }
}

export { PointLightHelper };
