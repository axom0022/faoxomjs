import { WebGPUPostProcessPass } from "./WebGPUPostProcessPass.js";

class WebGPUToneMappingPass extends WebGPUPostProcessPass {
    constructor(options) { options = options || {}; super("toneMapping", "let mapped = vec3<f32>(1.0) - exp(-color * params.exposure); return vec4<f32>(pow(max(mapped, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.2)), 1.0);", options); }
}

export { WebGPUToneMappingPass };
