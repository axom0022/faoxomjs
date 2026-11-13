import { WebGLRenderTarget } from "./WebGLRenderTarget.js";

class EffectComposer {
    constructor(renderer, renderTarget) {
        this.renderer = renderer;
        var width = (renderer && renderer.canvas) ? renderer.canvas.width : 800;
        var height = (renderer && renderer.canvas) ? renderer.canvas.height : 600;
        this.renderTarget1 = renderTarget || new WebGLRenderTarget(width, height);
        this.renderTarget2 = (this.renderTarget1 && typeof this.renderTarget1.clone === "function") ?
            this.renderTarget1.clone() :
            new WebGLRenderTarget(width, height);
        this.writeBuffer = this.renderTarget1;
        this.readBuffer = this.renderTarget2;
        this.passes = [];
    }
    addPass(pass) {
        this.passes.push(pass);
        return this;
    }
    insertPass(pass, index) {
        this.passes.splice(index, 0, pass);
        return this;
    }
    removePass(pass) {
        var idx = this.passes.indexOf(pass);
        if (idx !== -1) this.passes.splice(idx, 1);
        return this;
    }
    swap() {
        var tmp = this.readBuffer;
        this.readBuffer = this.writeBuffer;
        this.writeBuffer = tmp;
    }
    render(deltaTime) {
        var dt = deltaTime || 0.016;
        for (var i = 0; i < this.passes.length; i++) {
            var pass = this.passes[i];
            if (!pass.enabled) continue;
            pass.render(this.renderer, this.writeBuffer, this.readBuffer, dt);
            if (pass.needsSwap) this.swap();
        }
    }
    setSize(width, height) {
        this.renderTarget1.setSize(width, height);
        this.renderTarget2.setSize(width, height);
        for (var i = 0; i < this.passes.length; i++) this.passes[i].setSize(width, height);
    }
    dispose() {
        this.renderTarget1.dispose();
        this.renderTarget2.dispose();
        for (var i = 0; i < this.passes.length; i++) this.passes[i].dispose();
    }
}

export { EffectComposer };
