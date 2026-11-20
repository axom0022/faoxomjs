import { ShaderNode } from "./ShaderNode.js";

class FresnelNode extends ShaderNode {
    constructor(zaqra, zaqrb, zaqrc) {
        super("fresnel", "float");
        this.bias = zaqra || .1;
        this.power = zaqrb || 2;
        this.scale = zaqrc || 1;
    }
    build() {
        return "(" + this.bias.toFixed(4) + " + " + this.scale.toFixed(4) + " * pow(1.0 - max(0.0, dot(normalize(vNormal), normalize(uCameraPosition - vWorldPosition))), " + this.power.toFixed(4) + "))";
    }
}

export { FresnelNode };
