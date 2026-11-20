import { BufferAttribute } from "../core/index.js";

import { Geometry } from "../geometries/index.js";

import { BasicMaterial } from "../materials/index.js";

import { Group, Line } from "../objects/index.js";

class DirectionalLightHelper extends Group {
    constructor(zalba, zalbb, zalbc) {
        super();
        this.light = zalba;
        this.size = zalbb !== undefined ? zalbb : 1;
        var zalbd = new Geometry;
        var zalbe = this.size;
        zalbd.attributes.position = new BufferAttribute(new Float32Array([ -zalbe, zalbe, 0, zalbe, zalbe, 0, zalbe, zalbe, 0, zalbe, -zalbe, 0, zalbe, -zalbe, 0, -zalbe, -zalbe, 0, -zalbe, -zalbe, 0, -zalbe, zalbe, 0, 0, 0, 0, 0, 0, -zalbe * 4 ]), 3);
        this.add(new Line(zalbd, new BasicMaterial({
            color: zalbc || (zalba.color ? zalba.color.getHex() : 16776960)
        })));
    }
    update() {
        if (this.light) this.position.copy(this.light.position);
    }
}

export { DirectionalLightHelper };
