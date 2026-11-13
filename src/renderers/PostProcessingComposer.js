import { RenderTarget } from "./RenderTarget.js";

class PostProcessingComposer {
    constructor(renderer, options) { options = options || {}; this.renderer = renderer; this.enabled = options.enabled !== false; this.passes = []; this.sceneTarget = null; this.pingTarget = null; this.pongTarget = null; this.width = 0; this.height = 0; this.resize(); renderer.postProcessing = this; }
    addPass(pass) { if (pass) this.passes.push(pass); return this; }
    removePass(pass) { var i = this.passes.indexOf(pass); if (i !== -1) this.passes.splice(i, 1); return this; }
    resize(width, height) { width = width || this.renderer.canvas.width; height = height || this.renderer.canvas.height; if (width === this.width && height === this.height && this.sceneTarget) return this; this.width = width; this.height = height; if (!this.sceneTarget) { this.sceneTarget = new RenderTarget(this.renderer, width, height, { depthTexture: true }); this.pingTarget = new RenderTarget(this.renderer, width, height); this.pongTarget = new RenderTarget(this.renderer, width, height); } else { this.sceneTarget.resize(width, height); this.pingTarget.resize(width, height); this.pongTarget.resize(width, height); } return this; }
    render(scene, camera) { this.resize(); this.renderer._postProcessingLock = true; this.renderer.renderScene(scene, camera, this.sceneTarget); this.renderer._postProcessingLock = false; var input = this.sceneTarget; var active = this.passes.filter(function(pass) { return pass && pass.enabled; }); if (!active.length) { this.renderer.drawPost(this.renderer.getPostProgram("precision mediump float; uniform sampler2D inputTexture; varying vec2 vUv; void main(){ gl_FragColor=texture2D(inputTexture,vUv); }"), input, null, {}, this.sceneTarget); return; } var targets = [this.pingTarget, this.pongTarget]; for (var i = 0; i < active.length; i++) { var output = i === active.length - 1 ? null : targets[i % 2]; active[i].render(this.renderer, input, output, this.sceneTarget); input = output || input; } }
    dispose() { if (this.sceneTarget) this.sceneTarget.dispose(); if (this.pingTarget) this.pingTarget.dispose(); if (this.pongTarget) this.pongTarget.dispose(); this.sceneTarget = null; this.pingTarget = null; this.pongTarget = null; }
}

export { PostProcessingComposer };
