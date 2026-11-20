import { Pass } from "./Pass.js";

class SSGIPass extends Pass {
    constructor(zatua) {
        super();
        zatua = zatua || {};
        this.scene = zatua.scene;
        this.camera = zatua.camera;
        this.samples = zatua.samples || 8;
        this.maxDistance = zatua.maxDistance || 3;
        this.intensity = zatua.intensity || 1;
    }
    render(zatua, zatub, zatuc) {
        if (!this.enabled) return;
        zatua.setRenderTarget(this.renderToScreen ? null : zatub);
    }
}

export { SSGIPass };
