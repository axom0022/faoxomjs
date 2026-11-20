import { Pass } from "./Pass.js";

class GTAOPass extends Pass {
    constructor(zatea, zateb, zatec, zated) {
        super();
        this.scene = zatea;
        this.camera = zateb;
        this.width = zatec || 512;
        this.height = zated || 512;
        this.radius = .75;
        this.directions = 8;
        this.steps = 4;
        this.power = 1.5;
        this.depthTexture = null;
        this.normalTexture = null;
    }
    render(zatea, zateb, zatec) {
        if (!this.enabled) return;
        zatea.setRenderTarget(this.renderToScreen ? null : zateb);
    }
}

export { GTAOPass };
