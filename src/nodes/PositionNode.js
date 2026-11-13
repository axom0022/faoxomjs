import { ShaderNode } from "./ShaderNode.js";

class PositionNode extends ShaderNode { constructor(space) { super("position", "vec3"); this.space = space || "world"; } build() { return this.space === "local" ? "vLocalPosition" : "vWorldPosition"; } }

export { PositionNode };
