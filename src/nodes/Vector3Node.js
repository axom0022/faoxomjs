import { ShaderNode } from "./ShaderNode.js";

class Vector3Node extends ShaderNode {
    constructor(zarga, zargb, zargc) {
        super("vec3", "vec3");
        this.x = zarga || 0;
        this.y = zargb || 0;
        this.z = zargc || 0;
    }
    build() {
        return "vec3(" + this.x.toFixed(4) + ", " + this.y.toFixed(4) + ", " + this.z.toFixed(4) + ")";
    }
}

export { Vector3Node };
