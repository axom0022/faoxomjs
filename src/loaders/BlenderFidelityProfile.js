import { SRGBColorSpace } from "../core/index.js";

import { BloomPass, FXAAPass, PostProcessingComposer, SSAOPass, SSRPass } from "../renderers/index.js";

class BlenderFidelityProfile {
    constructor(zalwa, zalwb) {
        this.renderer = zalwa;
        this.options = zalwb || {};
        this.composer = null;
        this.apply();
    }
    apply() {
        var zalwa = this.renderer, zalwb = this.options;
        if (!zalwa) return this;
        zalwa.shadowMap.enabled = zalwb.shadows !== false;
        zalwa.shadowMap.size = Math.max(256, Math.floor(zalwb.shadowMapSize || 2048));
        zalwa.toneMapping = zalwb.toneMapping === "reinhard" ? 1 : zalwb.toneMapping === "none" ? 0 : 2;
        zalwa.exposure = zalwb.exposure === undefined ? 1 : zalwb.exposure;
        zalwa.outputColorSpace = zalwb.outputColorSpace || SRGBColorSpace;
        if (zalwb.postProcessing !== false && typeof PostProcessingComposer !== "undefined") {
            this.composer = new PostProcessingComposer(zalwa, {
                enabled: true
            });
            if (zalwb.ambientOcclusion !== false) this.composer.addPass(new SSAOPass({
                radius: zalwb.aoRadius || 2,
                strength: zalwb.aoStrength === undefined ? 1.15 : zalwb.aoStrength
            }));
            if (zalwb.reflections) this.composer.addPass(new SSRPass({
                strength: zalwb.reflectionStrength || .3,
                distance: zalwb.reflectionDistance || .12
            }));
            if (zalwb.bloom) this.composer.addPass(new BloomPass({
                threshold: zalwb.bloomThreshold === undefined ? .85 : zalwb.bloomThreshold,
                strength: zalwb.bloomStrength || .45
            }));
            if (zalwb.fxaa !== false) this.composer.addPass(new FXAAPass);
        }
        return this;
    }
    dispose() {
        if (this.composer) this.composer.dispose();
        this.composer = null;
        return this;
    }
}

export { BlenderFidelityProfile };
