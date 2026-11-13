// FaoxomSceneElement - the zero-config `<faoxom-scene>` custom element
// (roadmap item 41). Declarative scene embedding with attributes:
//   src               .faox container URL to load
//   backend           "webgl" (default) or "webgpu"
//   width / height    CSS pixels (default: fill the element box, 300x150 min)
//   background        #rrggbb or 0xrrggbb clear color
//   camera-fov        degrees (default 60)
//   camera-position   "x,y,z" (default "0,2,6")
//   camera-target     "x,y,z" (default "0,0,0")
//   orbit             enables OrbitControls when present
//   ambient           ambient light "intensity" or "intensity,#color" (default 0.6)
//   sun               directional light "intensity" or "intensity,#color"; cast-shadow unless "noshadow"
//   post              comma list: bloom, fxaa, ssao, vignette
// Events: "ready", "load", "error". Accessors: getApp(), getScene(),
// getCamera(), getControls().

import { FaoxomJs } from "../core/facade.js";
import { OrbitControls } from "../camera/OrbitControls.js";
import { FaoxLoader } from "./Faox.js";
import { BloomPass, FXAAPass, SSAOPass, VignettePass } from "../renderers/index.js";
import { Color } from "../math/index.js";

function parseTriple(value, fallback) {
    if (typeof value !== "string" || !value.trim()) return fallback;
    var parts = value.split(",").map(Number);
    if (parts.length !== 3 || parts.some(function (p) { return !Number.isFinite(p); })) return fallback;
    return parts;
}

function parseLight(value, defaultIntensity) {
    // "1.5" or "1.5,#ffddaa" or "#ffddaa"
    var intensity = defaultIntensity;
    var color = null;
    if (typeof value === "string" && value.trim()) {
        var parts = value.split(",").map(function (part) { return part.trim(); });
        for (var i = 0; i < parts.length; i++) {
            if (parts[i].charAt(0) === "#") color = parseInt(parts[i].slice(1), 16);
            else if (Number.isFinite(Number(parts[i]))) intensity = Number(parts[i]);
        }
    }
    return { intensity: intensity, color: color };
}

function parseBackground(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.charAt(0) === "#") {
        var parsed = parseInt(value.slice(1), 16);
        return Number.isFinite(parsed) ? parsed : null;
    }
    var asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : null;
}

var ElementBase = typeof HTMLElement !== "undefined" ? HTMLElement : class { };

class FaoxomSceneElement extends ElementBase {
    static get observedAttributes() {
        return ["src", "background", "camera-fov", "camera-position", "camera-target", "orbit", "ambient", "sun", "post"];
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
            var self = this;
            requestAnimationFrame(function () { self._build(); });
        } else this._build();
    }

    disconnectedCallback() {
        this._teardown();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue || !this.app) return;
        if (name === "src") { this._loadScene(newValue); return; }
        if (name === "background") { this._applyBackground(newValue); return; }
        if (name === "camera-fov" || name === "camera-position" || name === "camera-target") { this._applyCamera(); return; }
        if (name === "ambient" || name === "sun") { this._applyLights(); return; }
        if (name === "orbit") { this._applyOrbit(); return; }
        if (name === "post") { this._applyPost(newValue); return; }
    }

    _emit(name, detail) {
        try { this.dispatchEvent(new CustomEvent(name, { detail: detail || null, bubbles: false })); } catch (eventError) { /* detached */ }
    }

    _build() {
        if (this.app || !this.isConnected) return;
        var width = parseInt(this.getAttribute("width"), 10) || 0;
        var height = parseInt(this.getAttribute("height"), 10) || 0;
        this.canvas = document.createElement("canvas");
        var styleWidth = width ? width + "px" : "100%";
        var styleHeight = height ? height + "px" : "100%";
        this.canvas.style.cssText = "display:block;width:" + styleWidth + ";height:" + styleHeight + ";";
        this.appendChild(this.canvas);
        var backend = (this.getAttribute("backend") || "webgl").toLowerCase();
        var app = new FaoxomJs({ renderer: { canvas: this.canvas, append: false } });
        app.init();
        this.app = app;
        if (backend === "webgpu" && typeof app.initWebGPU === "function") {
            var self = this;
            app.initWebGPU({ canvas: this.canvas }).then(function () { self._finishBuild(); }).catch(function (error) { self._emit("error", String(error && error.message || error)); });
            return;
        }
        this._finishBuild();
    }

    _finishBuild() {
        var app = this.app;
        var scene = app.activeScene;
        this.camera = app.createPerspectiveCamera(60, 1, 0.1, 2000);
        scene.add(this.camera);
        this._applyCamera();
        this._applyBackground(this.getAttribute("background"));
        this._applyLights();
        this._applyOrbit();
        this._applyPost(this.getAttribute("post"));
        var self = this;
        this._frameCallback = function (dt) { if (self.controls) self.controls.update(dt); };
        app.addFrameCallback(this._frameCallback);
        app.start();
        this._emit("ready", { backend: (this.getAttribute("backend") || "webgl") });
        var src = this.getAttribute("src");
        if (src) this._loadScene(src);
    }

    _applyCamera() {
        if (!this.camera) return;
        var fov = parseFloat(this.getAttribute("camera-fov"));
        if (Number.isFinite(fov) && fov > 0) this.camera.fov = fov;
        var canvas = this.canvas;
        var aspect = canvas && canvas.clientWidth ? canvas.clientWidth / (canvas.clientHeight || 1) : 1;
        if (Number.isFinite(aspect) && aspect > 0) this.camera.aspect = aspect;
        var position = parseTriple(this.getAttribute("camera-position"), [0, 2, 6]);
        var target = parseTriple(this.getAttribute("camera-target"), [0, 0, 0]);
        this.camera.position.set(position[0], position[1], position[2]);
        this.camera.lookAt(target[0], target[1], target[2]);
        this.camera.updateProjectionMatrix();
        this.camera.updateMatrixWorld(true);
        if (this.controls && this.controls.target) {
            this.controls.target.set(target[0], target[1], target[2]);
        }
    }

    _applyBackground(value) {
        if (!this.app || !this.app.activeScene) return;
        var background = parseBackground(value);
        if (background !== null) {
            this.app.activeScene.background = new Color(background);
            if (this.app.renderer) this.app.renderer.clearColor = new Color(background);
        }
    }

    _applyLights() {
        if (!this.app || !this._lightRig) {
            if (!this.app) return;
        }
        var scene = this.app.activeScene;
        if (!scene) return;
        if (this._lightRig) {
            if (this._lightRig.ambient && this._lightRig.ambient.parent) this._lightRig.ambient.parent.remove(this._lightRig.ambient);
            if (this._lightRig.sun && this._lightRig.sun.parent) this._lightRig.sun.parent.remove(this._lightRig.sun);
        }
        this._lightRig = { ambient: null, sun: null };
        var ambientSpec = this.getAttribute("ambient");
        var sunSpec = this.getAttribute("sun");
        if (ambientSpec !== null || sunSpec !== null) {
            var ambient = parseLight(ambientSpec, 0.6);
            this._lightRig.ambient = this.app.createAmbientLight(ambient.color !== null ? ambient.color : 0xffffff, ambient.intensity);
            scene.add(this._lightRig.ambient);
            if (sunSpec !== null) {
                var sun = parseLight(sunSpec, 1);
                var light = this.app.createDirectionalLight(sun.color !== null ? sun.color : 0xffffff, sun.intensity);
                if (sunSpec.indexOf("noshadow") === -1) light.castShadow = true;
                light.position.set(4, 8, 5);
                scene.add(light);
                this._lightRig.sun = light;
            }
        }
    }

    _applyOrbit() {
        var enabled = this.hasAttribute("orbit");
        if (enabled && !this.controls && this.camera && this.canvas) {
            this.controls = new OrbitControls(this.camera, this.canvas);
            var target = parseTriple(this.getAttribute("camera-target"), [0, 0, 0]);
            if (this.controls.target) this.controls.target.set(target[0], target[1], target[2]);
        } else if (!enabled && this.controls) {
            if (this.controls.dispose) this.controls.dispose();
            this.controls = null;
        }
    }

    _applyPost(value) {
        if (!this.app || !this.app.renderer) return;
        if (this._composer) {
            if (this._composer.dispose) this._composer.dispose();
            this._composer = null;
        }
        if (this.app.renderer.postProcessing) this.app.renderer.postProcessing = null;
        var list = (value || "").split(",").map(function (entry) { return entry.trim().toLowerCase(); }).filter(Boolean);
        if (!list.length) return;
        var composer = this.app.createPostProcessing({ enabled: true });
        var passMap = { bloom: BloomPass, fxaa: FXAAPass, ssao: SSAOPass, vignette: VignettePass };
        for (var i = 0; i < list.length; i++) {
            var PassClass = passMap[list[i]];
            if (!PassClass) continue;
            try { composer.addPass(new PassClass()); } catch (passError) { /* pass options invalid */ }
        }
        this._composer = composer;
    }

    _loadScene(src) {
        if (!src) return;
        var self = this;
        new FaoxLoader().load(src).then(function (loaded) {
            if (!self.app) return;
            var scene = loaded.scene;
            if (self.camera && self.camera.parent) self.camera.parent.remove(self.camera);
            if (self._lightRig) {
                if (self._lightRig.ambient && self._lightRig.ambient.parent) self._lightRig.ambient.parent.remove(self._lightRig.ambient);
                if (self._lightRig.sun && self._lightRig.sun.parent) self._lightRig.sun.parent.remove(self._lightRig.sun);
            }
            self.app.setActiveScene(scene);
            scene.add(self.camera);
            if (self._lightRig) {
                if (self._lightRig.ambient) scene.add(self._lightRig.ambient);
                if (self._lightRig.sun) scene.add(self._lightRig.sun);
            }
            self._applyBackground(self.getAttribute("background"));
            self._loaded = true;
            self._emit("load", { objects: scene.children.length, faoxHash: loaded.hash });
        }).catch(function (error) {
            self._emit("error", String(error && error.message || error));
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
            try { this.app.destroy(); } catch (destroyError) { /* renderer gone */ }
        }
        this.app = null;
        this.camera = null;
        if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
        this.canvas = null;
        this._loaded = false;
    }

    getApp() { return this.app; }
    getScene() { return this.app ? this.app.activeScene : null; }
    getCamera() { return this.camera; }
    getControls() { return this.controls; }
    isLoaded() { return this._loaded; }
}

if (typeof customElements !== "undefined" && !customElements.get("faoxom-scene")) {
    customElements.define("faoxom-scene", FaoxomSceneElement);
}

export { FaoxomSceneElement };
