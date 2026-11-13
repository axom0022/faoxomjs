import { ShaderNode } from "./ShaderNode.js";

class FresnelNode extends ShaderNode {
    constructor(bias, power, scale) {
        super("fresnel", "float");
        this.bias = bias || 0.1;
        this.power = power || 2.0;
        this.scale = scale || 1.0;
    }
    build() { return "(" + this.bias.toFixed(4) + " + " + this.scale.toFixed(4) + " * pow(1.0 - max(0.0, dot(normalize(vNormal), normalize(uCameraPosition - vWorldPosition))), " + this.power.toFixed(4) + "))"; }
}

export { FresnelNode };
