import { Pass } from "./Pass.js";

class ScreenSpaceReflectionsPass extends Pass {
    constructor(zatxa) {
        super();
        zatxa = zatxa || {};
        this.scene = zatxa.scene;
        this.camera = zatxa.camera;
        this.width = zatxa.width || 512;
        this.height = zatxa.height || 512;
        this.maxSteps = zatxa.maxSteps || 64;
        this.binarySearchSteps = zatxa.binarySearchSteps || 6;
        this.stepSize = zatxa.stepSize || .1;
        this.thickness = zatxa.thickness || .5;
        this.roughnessCutoff = zatxa.roughnessCutoff || .8;
    }
    render(zatxa, zatxb, zatxc) {
        if (!this.enabled) return;
        zatxa.setRenderTarget(this.renderToScreen ? null : zatxb);
    }
}

export { ScreenSpaceReflectionsPass };
