import { ShaderNode } from "./ShaderNode.js";

class FloatNode extends ShaderNode {
    constructor(value) { super("float", "float"); this.value = value || 0.0; }
    build() { return this.value.toFixed(4); }
}

export { FloatNode };
