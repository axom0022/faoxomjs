import { Pass } from "./Pass.js";

class ScreenSpaceReflectionsPass extends Pass {
    constructor(options) {
        super();
        options = options || {};
        this.scene = options.scene;
        this.camera = options.camera;
        this.width = options.width || 512;
        this.height = options.height || 512;
        this.maxSteps = options.maxSteps || 64;
        this.binarySearchSteps = options.binarySearchSteps || 6;
        this.stepSize = options.stepSize || 0.1;
        this.thickness = options.thickness || 0.5;
        this.roughnessCutoff = options.roughnessCutoff || 0.8;
    }
    render(renderer, writeBuffer, readBuffer) {
        if (!this.enabled) return;
        renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    }
}

export { ScreenSpaceReflectionsPass };
