import { ShaderNode } from "./ShaderNode.js";

class Vector4Node extends ShaderNode {
    constructor(x, y, z, w) { super("vec4", "vec4"); this.x = x || 0; this.y = y || 0; this.z = z || 0; this.w = w !== undefined ? w : 1; }
    build() { return "vec4(" + this.x.toFixed(4) + ", " + this.y.toFixed(4) + ", " + this.z.toFixed(4) + ", " + this.w.toFixed(4) + ")"; }
}

export { Vector4Node };
