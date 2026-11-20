import { ShaderNode } from "./ShaderNode.js";

class Vector2Node extends ShaderNode {
    constructor(zarfa, zarfb) {
        super("vec2", "vec2");
        this.x = zarfa || 0;
        this.y = zarfb || 0;
    }
    build() {
        return "vec2(" + this.x.toFixed(4) + ", " + this.y.toFixed(4) + ")";
    }
}

export { Vector2Node };
