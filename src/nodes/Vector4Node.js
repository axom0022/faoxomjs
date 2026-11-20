import { ShaderNode } from "./ShaderNode.js";

class Vector4Node extends ShaderNode {
    constructor(zarha, zarhb, zarhc, zarhd) {
        super("vec4", "vec4");
        this.x = zarha || 0;
        this.y = zarhb || 0;
        this.z = zarhc || 0;
        this.w = zarhd !== undefined ? zarhd : 1;
    }
    build() {
        return "vec4(" + this.x.toFixed(4) + ", " + this.y.toFixed(4) + ", " + this.z.toFixed(4) + ", " + this.w.toFixed(4) + ")";
    }
}

export { Vector4Node };
