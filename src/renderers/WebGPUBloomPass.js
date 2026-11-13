import { WebGPUPostProcessPass } from "./WebGPUPostProcessPass.js";

class WebGPUBloomPass extends WebGPUPostProcessPass {
    constructor(options) { options = options || {}; super("bloom", "let blur = (textureSample(inputTexture, inputSampler, input.uv + vec2<f32>(params.texelSize.x * 2.0, 0.0)).rgb + textureSample(inputTexture, inputSampler, input.uv - vec2<f32>(params.texelSize.x * 2.0, 0.0)).rgb + textureSample(inputTexture, inputSampler, input.uv + vec2<f32>(0.0, params.texelSize.y * 2.0)).rgb + textureSample(inputTexture, inputSampler, input.uv - vec2<f32>(0.0, params.texelSize.y * 2.0)).rgb + textureSample(inputTexture, inputSampler, input.uv + params.texelSize).rgb + textureSample(inputTexture, inputSampler, input.uv - params.texelSize).rgb + textureSample(inputTexture, inputSampler, input.uv + vec2<f32>(params.texelSize.x, -params.texelSize.y)).rgb + textureSample(inputTexture, inputSampler, input.uv + vec2<f32>(-params.texelSize.x, params.texelSize.y)).rgb) / 8.0; let blurLuma = dot(blur, vec3<f32>(0.2126, 0.7152, 0.0722)); let bright = max(blurLuma - params.threshold, 0.0); return vec4<f32>(color + blur * bright * params.strength, 1.0);", options); }
}

export { WebGPUBloomPass };
