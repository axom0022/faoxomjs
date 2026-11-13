import { Pass } from "./Pass.js";

class HBAOPass extends Pass {
    constructor(scene, camera, width, height) {
        super();
        this.scene = scene;
        this.camera = camera;
        this.width = width || 512;
        this.height = height || 512;
        this.radius = 1.0;
        this.bias = 0.1;
        this.angleRays = 6;
        this.stepsPerRay = 4;
    }
    render(renderer, writeBuffer, readBuffer) {
        if (!this.enabled) return;
        renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    }
}

export { HBAOPass };
