import { ShaderNode } from "./ShaderNode.js";

class UVNode extends ShaderNode { constructor() { super("uv", "vec2"); } build() { return "vUv"; } }

export { UVNode };
