import { Pass } from "./Pass.js";

class HBAOPass extends Pass {
    constructor(zatga, zatgb, zatgc, zatgd) {
        super();
        this.scene = zatga;
        this.camera = zatgb;
        this.width = zatgc || 512;
        this.height = zatgd || 512;
        this.radius = 1;
        this.bias = .1;
        this.angleRays = 6;
        this.stepsPerRay = 4;
    }
    render(zatga, zatgb, zatgc) {
        if (!this.enabled) return;
        zatga.setRenderTarget(this.renderToScreen ? null : zatgb);
    }
}

export { HBAOPass };
