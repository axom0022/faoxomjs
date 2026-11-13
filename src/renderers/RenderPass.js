import { Pass } from "./Pass.js";

class RenderPass extends Pass {
    constructor(scene, camera, overrideMaterial, clearColor, clearAlpha) {
        super();
        this.scene = scene;
        this.camera = camera;
        this.overrideMaterial = overrideMaterial;
        this.clearColor = clearColor;
        this.clearAlpha = clearAlpha !== undefined ? clearAlpha : 0;
        this.clear = true;
        this.needsSwap = false;
    }
    render(renderer, writeBuffer, readBuffer) {
        var oldAutoClear = renderer.autoClear;
        renderer.autoClear = this.clear;
        renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
        renderer.render(this.scene, this.camera);
        renderer.autoClear = oldAutoClear;
    }
}

export { RenderPass };
