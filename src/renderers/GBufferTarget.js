import { RenderTarget } from "./RenderTarget.js";

class GBufferTarget extends RenderTarget {
    constructor(renderer, width, height, options) { super(renderer, width, height, options); this.requestedMsaa = 0; this.resize(this.width, this.height); }
    resize(width, height) { super.resize(width, height); var gl = this.renderer.gl; if (!gl || !this.renderer.isWebGL2) return this; if (!this.normalTexture) this.normalTexture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.normalTexture); gl.texImage2D(gl.TEXTURE_2D, 0, this.renderer.isWebGL2 && gl.RGBA16F ? gl.RGBA16F : gl.RGBA, this.width, this.height, 0, gl.RGBA, this.renderer.isWebGL2 && gl.HALF_FLOAT ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.normalTexture, 0); if (gl.drawBuffers) gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]); gl.bindFramebuffer(gl.FRAMEBUFFER, null); return this; }
    dispose() { var gl = this.renderer.gl; if (gl && gl.deleteTexture && this.normalTexture) gl.deleteTexture(this.normalTexture); this.normalTexture = null; super.dispose(); }
}

export { GBufferTarget };
