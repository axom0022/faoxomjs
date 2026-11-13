import { FloatNode } from "./FloatNode.js";
import { ShaderNode } from "./ShaderNode.js";

class MathNode extends ShaderNode {
    constructor(method, a, b, c) {
        super("math", a && a.getType ? a.getType() : "float");
        this.method = method;
        this.a = a instanceof ShaderNode ? a : (a !== undefined ? new FloatNode(a) : null);
        this.b = b instanceof ShaderNode ? b : (b !== undefined ? new FloatNode(b) : null);
        this.c = c instanceof ShaderNode ? c : (c !== undefined ? new FloatNode(c) : null);
    }
    build(builder) {
        var strA = this.a ? this.a.build(builder) : "";
        var strB = this.b ? ", " + this.b.build(builder) : "";
        var strC = this.c ? ", " + this.c.build(builder) : "";
        return this.method + "(" + strA + strB + strC + ")";
    }
}

export { MathNode };
