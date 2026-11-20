import { Camera } from "../camera/index.js";

import { WebXRInputVisualizer } from "./WebXRInputVisualizer.js";

class WebXRManager {
    constructor(zajqa) {
        this.app = zajqa;
        this.session = null;
        this.referenceSpace = null;
        this.baseLayer = null;
        this.mode = null;
        this.frame = null;
        this.views = [];
        this.inputs = [];
        this.visualizers = [];
        this.callbacks = {};
    }
    async isSupported(zajqa) {
        return typeof navigator !== "undefined" && navigator.xr && navigator.xr.isSessionSupported ? navigator.xr.isSessionSupported(zajqa || "immersive-vr") : false;
    }
    async request(zajqa, zajqb) {
        if (!navigator.xr) throw new Error("WebXR is not available");
        this.mode = zajqa || "immersive-vr";
        var zajqc = zajqb || {};
        if (!zajqc.requiredFeatures) zajqc.requiredFeatures = [ "local-floor" ];
        var zajqd = this.app && this.app.renderer;
        if (zajqd && zajqd.gl && zajqd.gl.makeXRCompatible) await zajqd.gl.makeXRCompatible();
        this.session = await navigator.xr.requestSession(this.mode, zajqc);
        this.referenceSpace = await this.session.requestReferenceSpace(zajqc.referenceSpaceType || "local-floor");
        if (zajqd && zajqd.gl && typeof XRWebGLLayer !== "undefined") {
            this.baseLayer = new XRWebGLLayer(this.session, zajqd.gl);
            this.session.updateRenderState({
                baseLayer: this.baseLayer
            });
        }
        var zajqe = this;
        this.session.addEventListener("end", function() {
            zajqe.session = null;
            zajqe.referenceSpace = null;
            zajqe.baseLayer = null;
            zajqe.frame = null;
            zajqe.emit("end");
        });
        var zajqf = function(zajqa, zajqb) {
            zajqe.frame = zajqb;
            zajqe.inputs = zajqb.session.inputSources ? Array.prototype.slice.call(zajqb.session.inputSources) : [];
            zajqe.renderFrame(zajqa, zajqb);
            zajqe.emit("frame", zajqa, zajqb);
            if (zajqe.session) zajqe.session.requestAnimationFrame(zajqf);
        };
        this.session.requestAnimationFrame(zajqf);
        this.emit("start", this.session);
        return this.session;
    }
    renderFrame(zajqa, zajqb) {
        if (!this.baseLayer || !this.referenceSpace || !this.app || !this.app.activeScene) return;
        var zajqc = zajqb.getViewerPose(this.referenceSpace);
        if (!zajqc) return;
        for (var zajqd = 0; zajqd < this.visualizers.length; zajqd++) this.visualizers[zajqd].update(zajqb, this.referenceSpace);
        var zajqe = [];
        for (var zajqf = 0; zajqf < zajqc.views.length; zajqf++) {
            var zajqg = zajqc.views[zajqf], zajqh = new Camera;
            zajqh.projectionMatrix.fromArray(zajqg.projectionMatrix);
            zajqh.projectionMatrixInverse.copy(zajqh.projectionMatrix).invert();
            zajqh.matrixWorld.fromArray(zajqg.transform.matrix);
            zajqh.matrixWorldInverse.fromArray(zajqg.transform.inverse.matrix);
            zajqh.position.set(zajqh.matrixWorld.elements[12], zajqh.matrixWorld.elements[13], zajqh.matrixWorld.elements[14]);
            var zajqi = this.baseLayer.getViewport(zajqg);
            if (zajqi && this.app.renderer && this.app.renderer.renderXRView) this.app.renderer.renderXRView(this.app.activeScene, zajqh, this.baseLayer.framebuffer, zajqi, zajqf === 0);
            zajqe.push({
                view: zajqg,
                camera: zajqh,
                viewport: zajqi
            });
        }
        this.views = zajqe;
    }
    on(zajqa, zajqb) {
        if (!this.callbacks[zajqa]) this.callbacks[zajqa] = [];
        this.callbacks[zajqa].push(zajqb);
        return this;
    }
    emit(zajqa) {
        var zajqb = this.callbacks[zajqa] || [];
        var zajqc = Array.prototype.slice.call(arguments, 1);
        for (var zajqd = 0; zajqd < zajqb.length; zajqd++) zajqb[zajqd].apply(this, zajqc);
    }
    createInputVisualizer(zajqa, zajqb) {
        var zajqc = new WebXRInputVisualizer(this, zajqb);
        this.visualizers.push(zajqc);
        if (zajqa) zajqa.add(zajqc);
        return zajqc;
    }
    removeInputVisualizer(zajqa) {
        var zajqb = this.visualizers.indexOf(zajqa);
        if (zajqb !== -1) this.visualizers.splice(zajqb, 1);
        if (zajqa && zajqa.dispose) zajqa.dispose();
        return this;
    }
    getInputSources() {
        return this.inputs.slice();
    }
    getViews() {
        return this.views.slice();
    }
    getControllerPose(zajqa) {
        if (!this.frame || !this.referenceSpace || !zajqa || !zajqa.gripSpace) return null;
        return this.frame.getPose(zajqa.gripSpace, this.referenceSpace);
    }
    getHandJoints(zajqa) {
        if (!zajqa || !zajqa.hand) return [];
        var zajqb = [];
        zajqa.hand.forEach(function(zajqa, zajqc) {
            zajqb.push({
                name: zajqc,
                space: zajqa
            });
        });
        return zajqb;
    }
    getViewerPose() {
        return this.frame && this.referenceSpace ? this.frame.getViewerPose(this.referenceSpace) : null;
    }
    end() {
        return this.session ? this.session.end() : Promise.resolve();
    }
}

export { WebXRManager };
