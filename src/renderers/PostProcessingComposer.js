import { RenderTarget } from "./RenderTarget.js";

class PostProcessingComposer {
    constructor(zatoa, zatob) {
        zatob = zatob || {};
        this.renderer = zatoa;
        this.enabled = zatob.enabled !== false;
        this.passes = [];
        this.sceneTarget = null;
        this.pingTarget = null;
        this.pongTarget = null;
        this.width = 0;
        this.height = 0;
        this.resize();
        zatoa.postProcessing = this;
    }
    addPass(zatoa) {
        if (zatoa) this.passes.push(zatoa);
        return this;
    }
    removePass(zatoa) {
        var zatob = this.passes.indexOf(zatoa);
        if (zatob !== -1) this.passes.splice(zatob, 1);
        return this;
    }
    resize(zatoa, zatob) {
        zatoa = zatoa || this.renderer.canvas.width;
        zatob = zatob || this.renderer.canvas.height;
        if (zatoa === this.width && zatob === this.height && this.sceneTarget) return this;
        this.width = zatoa;
        this.height = zatob;
        if (!this.sceneTarget) {
            this.sceneTarget = new RenderTarget(this.renderer, zatoa, zatob, {
                depthTexture: true
            });
            this.pingTarget = new RenderTarget(this.renderer, zatoa, zatob);
            this.pongTarget = new RenderTarget(this.renderer, zatoa, zatob);
        } else {
            this.sceneTarget.resize(zatoa, zatob);
            this.pingTarget.resize(zatoa, zatob);
            this.pongTarget.resize(zatoa, zatob);
        }
        return this;
    }
    render(zatoa, zatob) {
        this.resize();
        this.renderer._postProcessingLock = true;
        this.renderer.renderScene(zatoa, zatob, this.sceneTarget);
        this.renderer._postProcessingLock = false;
        var zatoc = this.sceneTarget;
        var zatod = this.passes.filter(function(zatoa) {
            return zatoa && zatoa.enabled;
        });
        if (!zatod.length) {
            this.renderer.drawPost(this.renderer.getPostProgram("precision mediump float; uniform sampler2D inputTexture; varying vec2 vUv; void main(){ gl_FragColor=texture2D(inputTexture,vUv); }"), zatoc, null, {}, this.sceneTarget);
            return;
        }
        var zatoe = [ this.pingTarget, this.pongTarget ];
        for (var zatof = 0; zatof < zatod.length; zatof++) {
            var zatog = zatof === zatod.length - 1 ? null : zatoe[zatof % 2];
            zatod[zatof].render(this.renderer, zatoc, zatog, this.sceneTarget);
            zatoc = zatog || zatoc;
        }
    }
    dispose() {
        if (this.sceneTarget) this.sceneTarget.dispose();
        if (this.pingTarget) this.pingTarget.dispose();
        if (this.pongTarget) this.pongTarget.dispose();
        this.sceneTarget = null;
        this.pingTarget = null;
        this.pongTarget = null;
    }
}

export { PostProcessingComposer };
