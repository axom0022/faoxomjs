import { SRGBColorSpace } from "../core/index.js";
import { BloomPass, FXAAPass, PostProcessingComposer, SSAOPass, SSRPass } from "../renderers/index.js";

class BlenderFidelityProfile {
    constructor(renderer, options) { this.renderer = renderer; this.options = options || {}; this.composer = null; this.apply(); }
    apply() { var renderer = this.renderer, options = this.options; if (!renderer) return this; renderer.shadowMap.enabled = options.shadows !== false; renderer.shadowMap.size = Math.max(256, Math.floor(options.shadowMapSize || 2048)); renderer.toneMapping = options.toneMapping === "reinhard" ? 1 : options.toneMapping === "none" ? 0 : 2; renderer.exposure = options.exposure === undefined ? 1 : options.exposure; renderer.outputColorSpace = options.outputColorSpace || SRGBColorSpace; if (options.postProcessing !== false && typeof PostProcessingComposer !== "undefined") { this.composer = new PostProcessingComposer(renderer, { enabled: true }); if (options.ambientOcclusion !== false) this.composer.addPass(new SSAOPass({ radius: options.aoRadius || 2, strength: options.aoStrength === undefined ? 1.15 : options.aoStrength })); if (options.reflections) this.composer.addPass(new SSRPass({ strength: options.reflectionStrength || 0.3, distance: options.reflectionDistance || 0.12 })); if (options.bloom) this.composer.addPass(new BloomPass({ threshold: options.bloomThreshold === undefined ? 0.85 : options.bloomThreshold, strength: options.bloomStrength || 0.45 })); if (options.fxaa !== false) this.composer.addPass(new FXAAPass()); } return this; }
    dispose() { if (this.composer) this.composer.dispose(); this.composer = null; return this; }
}

export { BlenderFidelityProfile };
