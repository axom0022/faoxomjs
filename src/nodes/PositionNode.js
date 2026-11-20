import { ShaderNode } from "./ShaderNode.js";

class PositionNode extends ShaderNode {
    constructor(zaqza) {
        super("position", "vec3");
        this.space = zaqza || "world";
    }
    build() {
        return this.space === "local" ? "vLocalPosition" : "vWorldPosition";
    }
}

export { PositionNode };
