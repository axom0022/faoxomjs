import { FloatNode } from "./FloatNode.js";

import { ShaderNode } from "./ShaderNode.js";

class MathNode extends ShaderNode {
    constructor(zaqsa, zaqsb, zaqsc, zaqsd) {
        super("math", zaqsb && zaqsb.getType ? zaqsb.getType() : "float");
        this.method = zaqsa;
        this.a = zaqsb instanceof ShaderNode ? zaqsb : zaqsb !== undefined ? new FloatNode(zaqsb) : null;
        this.b = zaqsc instanceof ShaderNode ? zaqsc : zaqsc !== undefined ? new FloatNode(zaqsc) : null;
        this.c = zaqsd instanceof ShaderNode ? zaqsd : zaqsd !== undefined ? new FloatNode(zaqsd) : null;
    }
    build(zaqsa) {
        var zaqsb = this.a ? this.a.build(zaqsa) : "";
        var zaqsc = this.b ? ", " + this.b.build(zaqsa) : "";
        var zaqsd = this.c ? ", " + this.c.build(zaqsa) : "";
        return this.method + "(" + zaqsb + zaqsc + zaqsd + ")";
    }
}

export { MathNode };
