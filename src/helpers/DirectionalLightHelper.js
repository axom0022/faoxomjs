import { BufferAttribute } from "../core/index.js";
import { Geometry } from "../geometries/index.js";
import { BasicMaterial } from "../materials/index.js";
import { Group, Line } from "../objects/index.js";

class DirectionalLightHelper extends Group {
    constructor(light, size, color) {
        super();
        this.light = light;
        this.size = size !== undefined ? size : 1;
        var geom = new Geometry();
        var s = this.size;
        geom.attributes.position = new BufferAttribute(new Float32Array([
            -s, s, 0,  s, s, 0,  s, s, 0,  s, -s, 0,  s, -s, 0, -s, -s, 0, -s, -s, 0, -s, s, 0,
            0, 0, 0, 0, 0, -s * 4
        ]), 3);
        this.add(new Line(geom, new BasicMaterial({ color: color || (light.color ? light.color.getHex() : 0xffff00) })));
    }
    update() { if (this.light) this.position.copy(this.light.position); }
}

export { DirectionalLightHelper };
