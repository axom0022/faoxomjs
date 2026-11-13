import { WebGPUPostProcessPass } from "./WebGPUPostProcessPass.js";

class WebGPUFXAAPass extends WebGPUPostProcessPass {
    constructor(options) { super("fxaa", "let nw = textureSample(inputTexture, inputSampler, input.uv + vec2<f32>(-1.0, -1.0) * params.texelSize).rgb; let ne = textureSample(inputTexture, inputSampler, input.uv + vec2<f32>(1.0, -1.0) * params.texelSize).rgb; let sw = textureSample(inputTexture, inputSampler, input.uv + vec2<f32>(-1.0, 1.0) * params.texelSize).rgb; let se = textureSample(inputTexture, inputSampler, input.uv + vec2<f32>(1.0, 1.0) * params.texelSize).rgb; let average = (nw + ne + sw + se + color) / 5.0; return vec4<f32>(mix(color, average, params.strength), 1.0);", options); }
}

export { WebGPUFXAAPass };
