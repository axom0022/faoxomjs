import { Pass } from "./Pass.js";

class BokehDepthOfFieldPass extends Pass {
    constructor(zasha, zashb, zashc) {
        super();
        zashc = zashc || {};
        this.scene = zasha;
        this.camera = zashb;
        this.focusDistance = zashc.focusDistance || 5;
        this.focalLength = zashc.focalLength || 50;
        this.fStop = zashc.fStop || 2.8;
        this.maxBlur = zashc.maxBlur || 1;
    }
    computeCoC(zasha) {
        var zashb = this.focusDistance;
        var zashc = this.focalLength * .001;
        var zashd = zashc / this.fStop;
        var zashe = Math.max(.001, zasha);
        return Math.abs(zashd * (zashc * (zashe - zashb)) / (zashe * (zashb - zashc)));
    }
    render(zasha, zashb, zashc) {
        if (!this.enabled) return;
        zasha.setRenderTarget(this.renderToScreen ? null : zashb);
    }
}

export { BokehDepthOfFieldPass };
