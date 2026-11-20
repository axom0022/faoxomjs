import { ShaderNode } from "./ShaderNode.js";

class FloatNode extends ShaderNode {
    constructor(zaqqa) {
        super("float", "float");
        this.value = zaqqa || 0;
    }
    build() {
        return this.value.toFixed(4);
    }
}

export { FloatNode };
