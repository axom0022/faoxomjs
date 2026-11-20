import { ShaderNode } from "./ShaderNode.js";

class TimerNode extends ShaderNode {
    constructor(zarda) {
        super("time", "float");
        this.speed = zarda || 1;
    }
    build() {
        return "(uTime * " + this.speed.toFixed(4) + ")";
    }
}

export { TimerNode };
