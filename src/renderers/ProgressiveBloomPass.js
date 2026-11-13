import { Pass } from "./Pass.js";

class ProgressiveBloomPass extends Pass {
    constructor(options) {
        super();
        options = options || {};
        this.strength = options.strength !== undefined ? options.strength : 1.0;
        this.radius = options.radius !== undefined ? options.radius : 0.5;
        this.threshold = options.threshold !== undefined ? options.threshold : 0.85;
        this.levels = 6;
        this.mipChain = [];
    }
    render(renderer, writeBuffer, readBuffer) {
        if (!this.enabled) return;
        renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    }
}

export { ProgressiveBloomPass };
