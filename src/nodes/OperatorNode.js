import { FloatNode } from "./FloatNode.js";
import { ShaderNode } from "./ShaderNode.js";

class OperatorNode extends ShaderNode {
    constructor(op, a, b) {
        super("operator", a && a.getType ? a.getType() : "float");
        this.op = op; this.a = a instanceof ShaderNode ? a : new FloatNode(a);
        this.b = b instanceof ShaderNode ? b : new FloatNode(b);
    }
    build(builder) {
        if (this.op === "dot") return "dot(" + this.a.build(builder) + ", " + this.b.build(builder) + ")";
        if (this.op === "cross") return "cross(" + this.a.build(builder) + ", " + this.b.build(builder) + ")";
        return "(" + this.a.build(builder) + " " + this.op + " " + this.b.build(builder) + ")";
    }
}

export { OperatorNode };
