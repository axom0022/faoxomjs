import { RenderTarget } from "./RenderTarget.js";

class GBufferTarget extends RenderTarget {
    constructor(zasta, zastb, zastc, zastd) {
        super(zasta, zastb, zastc, zastd);
        this.requestedMsaa = 0;
        this.resize(this.width, this.height);
    }
    resize(zasta, zastb) {
        super.resize(zasta, zastb);
        var zastc = this.renderer.gl;
        if (!zastc || !this.renderer.isWebGL2) return this;
        if (!this.normalTexture) this.normalTexture = zastc.createTexture();
        zastc.bindTexture(zastc.TEXTURE_2D, this.normalTexture);
        zastc.texImage2D(zastc.TEXTURE_2D, 0, this.renderer.isWebGL2 && zastc.RGBA16F ? zastc.RGBA16F : zastc.RGBA, this.width, this.height, 0, zastc.RGBA, this.renderer.isWebGL2 && zastc.HALF_FLOAT ? zastc.HALF_FLOAT : zastc.UNSIGNED_BYTE, null);
        zastc.texParameteri(zastc.TEXTURE_2D, zastc.TEXTURE_MIN_FILTER, zastc.NEAREST);
        zastc.texParameteri(zastc.TEXTURE_2D, zastc.TEXTURE_MAG_FILTER, zastc.NEAREST);
        zastc.texParameteri(zastc.TEXTURE_2D, zastc.TEXTURE_WRAP_S, zastc.CLAMP_TO_EDGE);
        zastc.texParameteri(zastc.TEXTURE_2D, zastc.TEXTURE_WRAP_T, zastc.CLAMP_TO_EDGE);
        zastc.bindFramebuffer(zastc.FRAMEBUFFER, this.framebuffer);
        zastc.framebufferTexture2D(zastc.FRAMEBUFFER, zastc.COLOR_ATTACHMENT1, zastc.TEXTURE_2D, this.normalTexture, 0);
        if (zastc.drawBuffers) zastc.drawBuffers([ zastc.COLOR_ATTACHMENT0, zastc.COLOR_ATTACHMENT1 ]);
        zastc.bindFramebuffer(zastc.FRAMEBUFFER, null);
        return this;
    }
    dispose() {
        var zasta = this.renderer.gl;
        if (zasta && zasta.deleteTexture && this.normalTexture) zasta.deleteTexture(this.normalTexture);
        this.normalTexture = null;
        super.dispose();
    }
}

export { GBufferTarget };
