import { ShaderNode } from "./ShaderNode.js";

class NoiseNode extends ShaderNode {
    constructor(type, scale) {
        super("noise", "float");
        this.noiseType = type || "2d";
        this.scale = scale || 1.0;
    }
    build() { return "fract(sin(dot(vUv * " + this.scale.toFixed(4) + ", vec2(12.9898, 78.233))) * 43758.5453)"; }
}

export { NoiseNode };
