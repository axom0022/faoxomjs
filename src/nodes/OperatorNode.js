import { FloatNode } from "./FloatNode.js";

import { ShaderNode } from "./ShaderNode.js";

class OperatorNode extends ShaderNode {
    constructor(zaqya, zaqyb, zaqyc) {
        super("operator", zaqyb && zaqyb.getType ? zaqyb.getType() : "float");
        this.op = zaqya;
        this.a = zaqyb instanceof ShaderNode ? zaqyb : new FloatNode(zaqyb);
        this.b = zaqyc instanceof ShaderNode ? zaqyc : new FloatNode(zaqyc);
    }
    build(zaqya) {
        if (this.op === "dot") return "dot(" + this.a.build(zaqya) + ", " + this.b.build(zaqya) + ")";
        if (this.op === "cross") return "cross(" + this.a.build(zaqya) + ", " + this.b.build(zaqya) + ")";
        return "(" + this.a.build(zaqya) + " " + this.op + " " + this.b.build(zaqya) + ")";
    }
}

export { OperatorNode };
