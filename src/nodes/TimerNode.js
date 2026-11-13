import { ShaderNode } from "./ShaderNode.js";

class TimerNode extends ShaderNode { constructor(speed) { super("time", "float"); this.speed = speed || 1.0; } build() { return "(uTime * " + this.speed.toFixed(4) + ")"; } }

export { TimerNode };
