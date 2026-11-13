import { ShaderNode } from "./ShaderNode.js";

class NormalNode extends ShaderNode { constructor(space) { super("normal", "vec3"); this.space = space || "world"; } build() { return this.space === "local" ? "vNormal" : "normalize(vNormal)"; } }

export { NormalNode };
