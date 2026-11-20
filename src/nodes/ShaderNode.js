import { faoxomstate } from "../core/index.js";

class ShaderNode {
    constructor(zaraa, zarab) {
        this.id = faoxomstate.faoxomidx++;
        this.type = zaraa || "node";
        this.outputType = zarab || "float";
        this.children = [];
    }
    getType() {
        return this.outputType;
    }
    build(zaraa) {
        return "0.0";
    }
    hash() {
        return this.type + "_" + this.id;
    }
}

export { ShaderNode };
