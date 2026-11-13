import { Color } from "../math/index.js";
import { ShaderNode } from "./ShaderNode.js";

class ColorNode extends ShaderNode {
    constructor(color) {
        super("color", "vec3");
        this.color = color instanceof Color ? color : new Color(color);
    }
    build() { return "vec3(" + this.color.r.toFixed(4) + ", " + this.color.g.toFixed(4) + ", " + this.color.b.toFixed(4) + ")"; }
}

export { ColorNode };
