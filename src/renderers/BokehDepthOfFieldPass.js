import { Pass } from "./Pass.js";

class BokehDepthOfFieldPass extends Pass {
    constructor(scene, camera, options) {
        super();
        options = options || {};
        this.scene = scene;
        this.camera = camera;
        this.focusDistance = options.focusDistance || 5.0;
        this.focalLength = options.focalLength || 50.0;
        this.fStop = options.fStop || 2.8;
        this.maxBlur = options.maxBlur || 1.0;
    }
    computeCoC(depth) {
        var s1 = this.focusDistance;
        var f = this.focalLength * 0.001;
        var A = f / this.fStop;
        var s2 = Math.max(0.001, depth);
        return Math.abs(A * (f * (s2 - s1)) / (s2 * (s1 - f)));
    }
    render(renderer, writeBuffer, readBuffer) {
        if (!this.enabled) return;
        renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    }
}

export { BokehDepthOfFieldPass };
