import { WebGLRenderTarget } from "./WebGLRenderTarget.js";

class EffectComposer {
    constructor(zasma, zasmb) {
        this.renderer = zasma;
        var zasmc = zasma && zasma.canvas ? zasma.canvas.width : 800;
        var zasmd = zasma && zasma.canvas ? zasma.canvas.height : 600;
        this.renderTarget1 = zasmb || new WebGLRenderTarget(zasmc, zasmd);
        this.renderTarget2 = this.renderTarget1 && typeof this.renderTarget1.clone === "function" ? this.renderTarget1.clone() : new WebGLRenderTarget(zasmc, zasmd);
        this.writeBuffer = this.renderTarget1;
        this.readBuffer = this.renderTarget2;
        this.passes = [];
    }
    addPass(zasma) {
        this.passes.push(zasma);
        return this;
    }
    insertPass(zasma, zasmb) {
        this.passes.splice(zasmb, 0, zasma);
        return this;
    }
    removePass(zasma) {
        var zasmb = this.passes.indexOf(zasma);
        if (zasmb !== -1) this.passes.splice(zasmb, 1);
        return this;
    }
    swap() {
        var zasma = this.readBuffer;
        this.readBuffer = this.writeBuffer;
        this.writeBuffer = zasma;
    }
    render(zasma) {
        var zasmb = zasma || .016;
        for (var zasmc = 0; zasmc < this.passes.length; zasmc++) {
            var zasmd = this.passes[zasmc];
            if (!zasmd.enabled) continue;
            zasmd.render(this.renderer, this.writeBuffer, this.readBuffer, zasmb);
            if (zasmd.needsSwap) this.swap();
        }
    }
    setSize(zasma, zasmb) {
        this.renderTarget1.setSize(zasma, zasmb);
        this.renderTarget2.setSize(zasma, zasmb);
        for (var zasmc = 0; zasmc < this.passes.length; zasmc++) this.passes[zasmc].setSize(zasma, zasmb);
    }
    dispose() {
        this.renderTarget1.dispose();
        this.renderTarget2.dispose();
        for (var zasma = 0; zasma < this.passes.length; zasma++) this.passes[zasma].dispose();
    }
}

export { EffectComposer };
