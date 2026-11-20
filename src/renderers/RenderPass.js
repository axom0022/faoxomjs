import { Pass } from "./Pass.js";

class RenderPass extends Pass {
    constructor(zatqa, zatqb, zatqc, zatqd, zatqe) {
        super();
        this.scene = zatqa;
        this.camera = zatqb;
        this.overrideMaterial = zatqc;
        this.clearColor = zatqd;
        this.clearAlpha = zatqe !== undefined ? zatqe : 0;
        this.clear = true;
        this.needsSwap = false;
    }
    render(zatqa, zatqb, zatqc) {
        var zatqd = zatqa.autoClear;
        zatqa.autoClear = this.clear;
        zatqa.setRenderTarget(this.renderToScreen ? null : zatqc);
        zatqa.render(this.scene, this.camera);
        zatqa.autoClear = zatqd;
    }
}

export { RenderPass };
