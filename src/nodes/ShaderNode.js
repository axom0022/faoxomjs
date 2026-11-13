import { faoxomstate } from "../core/index.js";

class ShaderNode {
    constructor(type, outputType) {
        this.id = faoxomstate.faoxomidx++;
        this.type = type || "node";
        this.outputType = outputType || "float";
        this.children = [];
    }
    getType() { return this.outputType; }
    build(builder) { return "0.0"; }
    hash() { return this.type + "_" + this.id; }
}

export { ShaderNode };
