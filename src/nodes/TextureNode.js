import { ShaderNode } from "./ShaderNode.js";
import { UVNode } from "./UVNode.js";

class TextureNode extends ShaderNode {
    constructor(texture, uvNode) {
        super("texture", "vec4");
        this.texture = texture;
        this.uvNode = uvNode || new UVNode();
    }
    build(builder) { return "texture2D(uDiffuseMap, " + this.uvNode.build(builder) + ")"; }
}

export { TextureNode };
