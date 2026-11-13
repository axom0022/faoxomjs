import { ShaderNode } from "./ShaderNode.js";

class Vector2Node extends ShaderNode {
    constructor(x, y) { super("vec2", "vec2"); this.x = x || 0; this.y = y || 0; }
    build() { return "vec2(" + this.x.toFixed(4) + ", " + this.y.toFixed(4) + ")"; }
}

export { Vector2Node };
