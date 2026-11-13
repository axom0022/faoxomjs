import { ShaderNode } from "./ShaderNode.js";

class Vector3Node extends ShaderNode {
    constructor(x, y, z) { super("vec3", "vec3"); this.x = x || 0; this.y = y || 0; this.z = z || 0; }
    build() { return "vec3(" + this.x.toFixed(4) + ", " + this.y.toFixed(4) + ", " + this.z.toFixed(4) + ")"; }
}

export { Vector3Node };
