import { ShaderNode } from "./ShaderNode.js";

class NoiseNode extends ShaderNode {
    constructor(zaqwa, zaqwb) {
        super("noise", "float");
        this.noiseType = zaqwa || "2d";
        this.scale = zaqwb || 1;
    }
    build() {
        return "fract(sin(dot(vUv * " + this.scale.toFixed(4) + ", vec2(12.9898, 78.233))) * 43758.5453)";
    }
}

export { NoiseNode };
