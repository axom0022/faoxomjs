import { Pass } from "./Pass.js";

class GTAOPass extends Pass {
    constructor(scene, camera, width, height) {
        super();
        this.scene = scene;
        this.camera = camera;
        this.width = width || 512;
        this.height = height || 512;
        this.radius = 0.75;
        this.directions = 8;
        this.steps = 4;
        this.power = 1.5;
        this.depthTexture = null;
        this.normalTexture = null;
    }
    render(renderer, writeBuffer, readBuffer) {
        if (!this.enabled) return;
        renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    }
}

export { GTAOPass };
