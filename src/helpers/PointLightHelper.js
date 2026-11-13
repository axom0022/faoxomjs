import { SphereGeometry } from "../geometries/index.js";
import { BasicMaterial } from "../materials/index.js";
import { Mesh } from "../objects/index.js";

class PointLightHelper extends Mesh {
    constructor(light, sphereSize, color) {
        super(new SphereGeometry(sphereSize || 0.5, 8, 4), new BasicMaterial({ color: color || (light.color ? light.color.getHex() : 0xffff00), wireframe: true }));
        this.light = light;
    }
    update() { if (this.light) this.position.copy(this.light.position); }
}

export { PointLightHelper };
