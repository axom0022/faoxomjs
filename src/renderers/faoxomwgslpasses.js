import { WebGPUPostProcessPass } from "./WebGPUPostProcessPass.js";

class WebGPUVignettePass extends WebGPUPostProcessPass {
    constructor(zauua) {
        zauua = zauua || {};
        super("vignette", "let p = input.uv - vec2<f32>(0.5); let vignette = 1.0 - smoothstep(0.25, 0.75, length(p)) * params.strength; return vec4<f32>(color * vignette, 1.0);", zauua);
    }
}

class WebGPUColorGradePass extends WebGPUPostProcessPass {
    constructor(zauva) {
        zauva = zauva || {};
        super("colorGrade", "let mapped = vec3<f32>(1.0) - exp(-color * params.exposure); let luma = dot(mapped, vec3<f32>(0.2126, 0.7152, 0.0722)); let graded = mix(vec3<f32>(luma), mapped, params.strength); return vec4<f32>(max(graded, vec3<f32>(0.0)), 1.0);", zauva);
    }
}

class WebGPUDepthOfFieldPass extends WebGPUPostProcessPass {
    constructor(zauwa) {
        zauwa = zauwa || {};
        super("depthOfField", "let radius = params.texelSize * max(params.threshold, 1.0); var sum = color; sum = sum + textureSample(inputTexture, inputSampler, input.uv + vec2<f32>(radius.x, 0.0)).rgb; sum = sum + textureSample(inputTexture, inputSampler, input.uv - vec2<f32>(radius.x, 0.0)).rgb; sum = sum + textureSample(inputTexture, inputSampler, input.uv + vec2<f32>(0.0, radius.y)).rgb; sum = sum + textureSample(inputTexture, inputSampler, input.uv - vec2<f32>(0.0, radius.y)).rgb; return vec4<f32>(mix(color, sum / 5.0, params.strength), 1.0);", zauwa);
    }
}

class WebGPUMotionBlurPass extends WebGPUPostProcessPass {
    constructor(zauwa) {
        zauwa = zauwa || {};
        super("motionBlur", "var sum = color; for (var step = 1u; step < 4u; step = step + 1u) { let offset = params.texelSize * params.threshold * f32(step); sum = sum + textureSample(inputTexture, inputSampler, input.uv - offset).rgb; } return vec4<f32>(sum / 4.0, 1.0);", zauwa);
    }
}

export { WebGPUColorGradePass, WebGPUDepthOfFieldPass, WebGPUMotionBlurPass, WebGPUVignettePass };
