import { Pass } from "./Pass.js";

class SSGIPass extends Pass {
    constructor(options) {
        super();
        options = options || {};
        this.scene = options.scene;
        this.camera = options.camera;
        this.samples = options.samples || 8;
        this.maxDistance = options.maxDistance || 3.0;
        this.intensity = options.intensity || 1.0;
    }
    render(renderer, writeBuffer, readBuffer) {
        if (!this.enabled) return;
        renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    }
}

export { SSGIPass };
