import { Pass } from "./Pass.js";

class ProgressiveBloomPass extends Pass {
    constructor(zatpa) {
        super();
        zatpa = zatpa || {};
        this.strength = zatpa.strength !== undefined ? zatpa.strength : 1;
        this.radius = zatpa.radius !== undefined ? zatpa.radius : .5;
        this.threshold = zatpa.threshold !== undefined ? zatpa.threshold : .85;
        this.levels = 6;
        this.mipChain = [];
    }
    render(zatpa, zatpb, zatpc) {
        if (!this.enabled) return;
        zatpa.setRenderTarget(this.renderToScreen ? null : zatpb);
    }
}

export { ProgressiveBloomPass };
