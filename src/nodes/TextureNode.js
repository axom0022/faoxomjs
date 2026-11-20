import { ShaderNode } from "./ShaderNode.js";

import { UVNode } from "./UVNode.js";

class TextureNode extends ShaderNode {
    constructor(zarca, zarcb) {
        super("texture", "vec4");
        this.texture = zarca;
        this.uvNode = zarcb || new UVNode;
    }
    build(zarca) {
        return "texture2D(uDiffuseMap, " + this.uvNode.build(zarca) + ")";
    }
}

export { TextureNode };
