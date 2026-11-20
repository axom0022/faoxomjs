import { FaoxomJs } from "../core/facade.js";

import { OrbitControls } from "../camera/OrbitControls.js";

import { FaoxLoader } from "./Faox.js";

import { BloomPass, FXAAPass, SSAOPass, VignettePass } from "../renderers/index.js";

import { Color } from "../math/index.js";

function zahha(zahha, zahhb) {
    if (typeof zahha !== "string" || !zahha.trim()) return zahhb;
    var zahhc = zahha.split(",").map(Number);
    if (zahhc.length !== 3 || zahhc.some(function(zahha) {
        return !Number.isFinite(zahha);
    })) return zahhb;
    return zahhc;
}

function zahhb(zahha, zahhb) {
    var zahhc = zahhb;
    var zahhd = null;
    if (typeof zahha === "string" && zahha.trim()) {
        var zahhe = zahha.split(",").map(function(zahha) {
            return zahha.trim();
        });
        for (var zahhf = 0; zahhf < zahhe.length; zahhf++) {
            if (zahhe[zahhf].charAt(0) === "#") zahhd = parseInt(zahhe[zahhf].slice(1), 16); else if (Number.isFinite(Number(zahhe[zahhf]))) zahhc = Number(zahhe[zahhf]);
        }
    }
    return {
        intensity: zahhc,
        color: zahhd
    };
}

function zahhc(zahha) {
    if (zahha === null || zahha === undefined || zahha === "") return null;
    if (typeof zahha === "number") return zahha;
    if (typeof zahha === "string" && zahha.charAt(0) === "#") {
        var zahhb = parseInt(zahha.slice(1), 16);
        return Number.isFinite(zahhb) ? zahhb : null;
    }
    var zahhc = Number(zahha);
    return Number.isFinite(zahhc) ? zahhc : null;
}

var zahhd = typeof HTMLElement !== "undefined" ? HTMLElement : class {};

class FaoxomSceneElement extends zahhd {
    static get observedAttributes() {
        return [ "src", "background", "camera-fov", "camera-position", "camera-target", "orbit", "ambient", "sun", "post" ];
    }
    constructor() {
        super();
        this.app = null;
        this.camera = null;
        this.controls = null;
        this.canvas = null;
        this._loaded = false;
        this._frameCallback = null;
        this._buildScheduled = false;
    }
    connectedCallback() {
        if (this.app) return;
        if (typeof requestAnimationFrame === "function") {
            var zahha = this;
            requestAnimationFrame(function() {
                zahha._build();
            });
        } else this._build();
    }
    disconnectedCallback() {
        this._teardown();
    }
    attributeChangedCallback(zahha, zahhb, zahhc) {
        if (zahhb === zahhc || !this.app) return;
        if (zahha === "src") {
            this._loadScene(zahhc);
            return;
        }
        if (zahha === "background") {
            this._applyBackground(zahhc);
            return;
        }
        if (zahha === "camera-fov" || zahha === "camera-position" || zahha === "camera-target") {
            this._applyCamera();
            return;
        }
        if (zahha === "ambient" || zahha === "sun") {
            this._applyLights();
            return;
        }
        if (zahha === "orbit") {
            this._applyOrbit();
            return;
        }
        if (zahha === "post") {
            this._applyPost(zahhc);
            return;
        }
    }
    _emit(zahha, zahhb) {
        try {
            this.dispatchEvent(new CustomEvent(zahha, {
                detail: zahhb || null,
                bubbles: false
            }));
        } catch (zahha) {}
    }
    _build() {
        if (this.app || !this.isConnected) return;
        var zahha = parseInt(this.getAttribute("width"), 10) || 0;
        var zahhb = parseInt(this.getAttribute("height"), 10) || 0;
        this.canvas = document.createElement("canvas");
        var zahhc = zahha ? zahha + "px" : "100%";
        var zahhd = zahhb ? zahhb + "px" : "100%";
        this.canvas.style.cssText = "display:block;width:" + zahhc + ";height:" + zahhd + ";";
        this.appendChild(this.canvas);
        var zahhe = (this.getAttribute("backend") || "webgl").toLowerCase();
        var zahhf = new FaoxomJs({
            renderer: {
                canvas: this.canvas,
                append: false
            }
        });
        zahhf.init();
        this.app = zahhf;
        if (zahhe === "webgpu" && typeof zahhf.initWebGPU === "function") {
            var zahhg = this;
            zahhf.initWebGPU({
                canvas: this.canvas
            }).then(function() {
                zahhg._finishBuild();
            }).catch(function(zahha) {
                zahhg._emit("error", String(zahha && zahha.message || zahha));
            });
            return;
        }
        this._finishBuild();
    }
    _finishBuild() {
        var zahha = this.app;
        var zahhb = zahha.activeScene;
        this.camera = zahha.createPerspectiveCamera(60, 1, .1, 2e3);
        zahhb.add(this.camera);
        this._applyCamera();
        this._applyBackground(this.getAttribute("background"));
        this._applyLights();
        this._applyOrbit();
        this._applyPost(this.getAttribute("post"));
        var zahhc = this;
        this._frameCallback = function(zahha) {
            if (zahhc.controls) zahhc.controls.update(zahha);
        };
        zahha.addFrameCallback(this._frameCallback);
        zahha.start();
        this._emit("ready", {
            backend: this.getAttribute("backend") || "webgl"
        });
        var zahhd = this.getAttribute("src");
        if (zahhd) this._loadScene(zahhd);
    }
    _applyCamera() {
        if (!this.camera) return;
        var zahhb = parseFloat(this.getAttribute("camera-fov"));
        if (Number.isFinite(zahhb) && zahhb > 0) this.camera.fov = zahhb;
        var zahhc = this.canvas;
        var zahhd = zahhc && zahhc.clientWidth ? zahhc.clientWidth / (zahhc.clientHeight || 1) : 1;
        if (Number.isFinite(zahhd) && zahhd > 0) this.camera.aspect = zahhd;
        var zahhe = zahha(this.getAttribute("camera-position"), [ 0, 2, 6 ]);
        var zahhf = zahha(this.getAttribute("camera-target"), [ 0, 0, 0 ]);
        this.camera.position.set(zahhe[0], zahhe[1], zahhe[2]);
        this.camera.lookAt(zahhf[0], zahhf[1], zahhf[2]);
        this.camera.updateProjectionMatrix();
        this.camera.updateMatrixWorld(true);
        if (this.controls && this.controls.target) {
            this.controls.target.set(zahhf[0], zahhf[1], zahhf[2]);
        }
    }
    _applyBackground(zahha) {
        if (!this.app || !this.app.activeScene) return;
        var zahhb = zahhc(zahha);
        if (zahhb !== null) {
            this.app.activeScene.background = new Color(zahhb);
            if (this.app.renderer) this.app.renderer.clearColor = new Color(zahhb);
        }
    }
    _applyLights() {
        if (!this.app || !this._lightRig) {
            if (!this.app) return;
        }
        var zahha = this.app.activeScene;
        if (!zahha) return;
        if (this._lightRig) {
            if (this._lightRig.ambient && this._lightRig.ambient.parent) this._lightRig.ambient.parent.remove(this._lightRig.ambient);
            if (this._lightRig.sun && this._lightRig.sun.parent) this._lightRig.sun.parent.remove(this._lightRig.sun);
        }
        this._lightRig = {
            ambient: null,
            sun: null
        };
        var zahhc = this.getAttribute("ambient");
        var zahhd = this.getAttribute("sun");
        if (zahhc !== null || zahhd !== null) {
            var zahhe = zahhb(zahhc, .6);
            this._lightRig.ambient = this.app.createAmbientLight(zahhe.color !== null ? zahhe.color : 16777215, zahhe.intensity);
            zahha.add(this._lightRig.ambient);
            if (zahhd !== null) {
                var zahhf = zahhb(zahhd, 1);
                var zahhg = this.app.createDirectionalLight(zahhf.color !== null ? zahhf.color : 16777215, zahhf.intensity);
                if (zahhd.indexOf("noshadow") === -1) zahhg.castShadow = true;
                zahhg.position.set(4, 8, 5);
                zahha.add(zahhg);
                this._lightRig.sun = zahhg;
            }
        }
    }
    _applyOrbit() {
        var zahhb = this.hasAttribute("orbit");
        if (zahhb && !this.controls && this.camera && this.canvas) {
            this.controls = new OrbitControls(this.camera, this.canvas);
            var zahhc = zahha(this.getAttribute("camera-target"), [ 0, 0, 0 ]);
            if (this.controls.target) this.controls.target.set(zahhc[0], zahhc[1], zahhc[2]);
        } else if (!zahhb && this.controls) {
            if (this.controls.dispose) this.controls.dispose();
            this.controls = null;
        }
    }
    _applyPost(zahha) {
        if (!this.app || !this.app.renderer) return;
        if (this._composer) {
            if (this._composer.dispose) this._composer.dispose();
            this._composer = null;
        }
        if (this.app.renderer.postProcessing) this.app.renderer.postProcessing = null;
        var zahhb = (zahha || "").split(",").map(function(zahha) {
            return zahha.trim().toLowerCase();
        }).filter(Boolean);
        if (!zahhb.length) return;
        var zahhc = this.app.createPostProcessing({
            enabled: true
        });
        var zahhd = {
            bloom: BloomPass,
            fxaa: FXAAPass,
            ssao: SSAOPass,
            vignette: VignettePass
        };
        for (var zahhe = 0; zahhe < zahhb.length; zahhe++) {
            var zahhf = zahhd[zahhb[zahhe]];
            if (!zahhf) continue;
            try {
                zahhc.addPass(new zahhf);
            } catch (zahha) {}
        }
        this._composer = zahhc;
    }
    _loadScene(zahha) {
        if (!zahha) return;
        var zahhb = this;
        (new FaoxLoader).load(zahha).then(function(zahha) {
            if (!zahhb.app) return;
            var zahhc = zahha.scene;
            if (zahhb.camera && zahhb.camera.parent) zahhb.camera.parent.remove(zahhb.camera);
            if (zahhb._lightRig) {
                if (zahhb._lightRig.ambient && zahhb._lightRig.ambient.parent) zahhb._lightRig.ambient.parent.remove(zahhb._lightRig.ambient);
                if (zahhb._lightRig.sun && zahhb._lightRig.sun.parent) zahhb._lightRig.sun.parent.remove(zahhb._lightRig.sun);
            }
            zahhb.app.setActiveScene(zahhc);
            zahhc.add(zahhb.camera);
            if (zahhb._lightRig) {
                if (zahhb._lightRig.ambient) zahhc.add(zahhb._lightRig.ambient);
                if (zahhb._lightRig.sun) zahhc.add(zahhb._lightRig.sun);
            }
            zahhb._applyBackground(zahhb.getAttribute("background"));
            zahhb._loaded = true;
            zahhb._emit("load", {
                objects: zahhc.children.length,
                faoxHash: zahha.hash
            });
        }).catch(function(zahha) {
            zahhb._emit("error", String(zahha && zahha.message || zahha));
        });
    }
    _teardown() {
        if (this._frameCallback && this.app) this.app.removeFrameCallback(this._frameCallback);
        this._frameCallback = null;
        if (this.controls && this.controls.dispose) this.controls.dispose();
        this.controls = null;
        if (this._composer && this._composer.dispose) this._composer.dispose();
        this._composer = null;
        if (this.app) {
            try {
                this.app.destroy();
            } catch (zahha) {}
        }
        this.app = null;
        this.camera = null;
        if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
        this.canvas = null;
        this._loaded = false;
    }
    getApp() {
        return this.app;
    }
    getScene() {
        return this.app ? this.app.activeScene : null;
    }
    getCamera() {
        return this.camera;
    }
    getControls() {
        return this.controls;
    }
    isLoaded() {
        return this._loaded;
    }
}

if (typeof customElements !== "undefined" && !customElements.get("faoxom-scene")) {
    customElements.define("faoxom-scene", FaoxomSceneElement);
}

export { FaoxomSceneElement };
