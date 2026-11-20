import { ShaderNode } from "./ShaderNode.js";

class NormalNode extends ShaderNode {
    constructor(zaqxa) {
        super("normal", "vec3");
        this.space = zaqxa || "world";
    }
    build() {
        return this.space === "local" ? "vNormal" : "normalize(vNormal)";
    }
}

export { NormalNode };
