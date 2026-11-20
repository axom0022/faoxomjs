import { BloomPass } from "./BloomPass.js";

import { BokehDepthOfFieldPass } from "./BokehDepthOfFieldPass.js";

import { ColorGradePass } from "./ColorGradePass.js";

import { FXAAPass } from "./FXAAPass.js";

import { GTAOPass } from "./GTAOPass.js";

import { HBAOPass } from "./HBAOPass.js";

import { MotionBlurPass } from "./MotionBlurPass.js";

import { PostProcessPass } from "./PostProcessPass.js";

import { PostProcessingComposer } from "./PostProcessingComposer.js";

import { ProgressiveBloomPass } from "./ProgressiveBloomPass.js";

import { SSGIPass } from "./SSGIPass.js";

import { SSAOPass } from "./SSAOPass.js";

import { SSRPass } from "./SSRPass.js";

import { TAAPass } from "./TAAPass.js";

import { VignettePass } from "./VignettePass.js";

import { WebGPUBloomPass } from "./WebGPUBloomPass.js";

import { WebGPUColorGradePass, WebGPUDepthOfFieldPass, WebGPUMotionBlurPass, WebGPUVignettePass } from "./faoxomwgslpasses.js";

import { WebGPUFXAAPass } from "./WebGPUFXAAPass.js";

import { WebGPUPostProcessPass } from "./WebGPUPostProcessPass.js";

import { WebGPUPostProcessingComposer } from "./WebGPUPostProcessingComposer.js";

import { WebGPUToneMappingPass } from "./WebGPUToneMappingPass.js";

const passes = {
    bloom: { glsl: BloomPass, wgsl: WebGPUBloomPass },
    progressivebloom: { glsl: ProgressiveBloomPass, wgsl: WebGPUBloomPass },
    fxaa: { glsl: FXAAPass, wgsl: WebGPUFXAAPass },
    tonemapping: { glsl: null, wgsl: WebGPUToneMappingPass },
    vignette: { glsl: VignettePass, wgsl: WebGPUVignettePass },
    colorgrade: { glsl: ColorGradePass, wgsl: WebGPUColorGradePass },
    dof: { glsl: BokehDepthOfFieldPass, wgsl: WebGPUDepthOfFieldPass },
    depthoffield: { glsl: BokehDepthOfFieldPass, wgsl: WebGPUDepthOfFieldPass },
    motionblur: { glsl: MotionBlurPass, wgsl: WebGPUMotionBlurPass },
    ssao: { glsl: SSAOPass, wgsl: null },
    gtao: { glsl: GTAOPass, wgsl: null },
    hbao: { glsl: HBAOPass, wgsl: null },
    ssgi: { glsl: SSGIPass, wgsl: null },
    ssr: { glsl: SSRPass, wgsl: null },
    taa: { glsl: TAAPass, wgsl: null },
    copy: { glsl: PostProcessPass, wgsl: WebGPUPostProcessPass }
};

function normalizeBackend(backend) {
    var key = String(backend || "").toLowerCase();
    return key === "webgpu" || key === "gpu" ? "wgsl" : "glsl";
}

function passClass(backend, name) {
    var entry = passes[String(name || "").toLowerCase()];
    if (!entry) return null;
    return entry[normalizeBackend(backend)] || null;
}

function createPass(backend, name, options) {
    var Constructor = passClass(backend, name);
    if (!Constructor) return null;
    return new Constructor(options);
}

function createComposer(renderer, options) {
    if (renderer && renderer.device) return new WebGPUPostProcessingComposer(renderer, options);
    return new PostProcessingComposer(renderer, options);
}

function passParity() {
    var result = {};
    var names = Object.keys(passes);
    for (var index = 0; index < names.length; index++) {
        var entry = passes[names[index]];
        result[names[index]] = {
            webgl: !!entry.glsl,
            webgpu: !!entry.wgsl
        };
    }
    return result;
}

function missingPasses(backend) {
    var key = normalizeBackend(backend);
    var parity = passParity();
    var names = Object.keys(parity);
    var missing = [];
    for (var index = 0; index < names.length; index++) {
        if (!parity[names[index]][key === "wgsl" ? "webgpu" : "webgl"]) missing.push(names[index]);
    }
    return missing;
}

function registerPass(name, entry) {
    if (!name || !entry) return null;
    passes[String(name).toLowerCase()] = {
        glsl: entry.glsl || null,
        wgsl: entry.wgsl || null
    };
    return passes[String(name).toLowerCase()];
}

export { createComposer, createPass, missingPasses, passClass, passParity, passes, registerPass };
