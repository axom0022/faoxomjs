import { WebGLRenderer } from "../renderers/index.js";

import { CrossOrigin } from "./CrossOrigin.js";

import { TaskPool } from "./TaskPool.js";

var zahva = [ "position:fixed", "top:12px", "left:12px", "z-index:2147483647", "font:11px/1.5 ui-monospace,Menlo,Consolas,monospace", "color:#d7dde8", "background:rgba(10,13,20,0.88)", "border:1px solid #2b3446", "border-radius:8px", "padding:8px 10px", "min-width:230px", "pointer-events:none", "user-select:none", "-webkit-user-select:none" ].join(";");

var zahvb = "display:flex;justify-content:space-between;gap:14px";

var zahvc = "color:#7d8aa5";

var zahvd = "color:#8fd3ff;font-weight:600;white-space:nowrap";

class Inspector {
    constructor(zahva, zahvb) {
        zahvb = zahvb || {};
        this.renderer = zahva;
        this.expand = zahvb.expand !== false;
        this.maxGraph = zahvb.graph || 120;
        this.hidden = false;
        this._frames = [];
        this._lastFrame = 0;
        this._raf = 0;
        this._dom = null;
        this._rows = {};
        this._graph = null;
        this._graphContext = null;
        this._build();
        this._wrapRender();
        this._running = true;
        this._loop = this._loop.bind(this);
        this._raf = requestAnimationFrame(this._loop);
    }
    _build() {
        if (typeof document === "undefined") return;
        var zahve = document.createElement("div");
        zahve.setAttribute("style", zahva);
        var zahvf = document.createElement("div");
        zahvf.setAttribute("style", "font-weight:700;color:#e8edf6;margin-bottom:4px;letter-spacing:0.4px");
        zahvf.textContent = "FAOXOM INSPECTOR";
        zahve.appendChild(zahvf);
        var zahvg = document.createElement("canvas");
        zahvg.width = 220;
        zahvg.height = 36;
        zahvg.setAttribute("style", "display:block;width:220px;height:36px;margin:2px 0 6px;background:#0a0d14;border-radius:4px");
        zahve.appendChild(zahvg);
        this._graph = zahvg;
        this._graphContext = zahvg.getContext("2d");
        var zahvh = document.createElement("div");
        zahve.appendChild(zahvh);
        this._body = zahvh;
        var zahvi = this;
        var zahvj = [ "fps", "frame", "draws", "triangles", "canvas", "textures", "programs", "memory", "objects", "lights", "workers", "isolation" ];
        for (var zahvk = 0; zahvk < zahvj.length; zahvk++) {
            var zahvl = document.createElement("div");
            zahvl.setAttribute("style", zahvb);
            var zahvm = document.createElement("span");
            zahvm.setAttribute("style", zahvc);
            zahvm.textContent = zahvj[zahvk];
            var zahvn = document.createElement("span");
            zahvn.setAttribute("style", zahvd);
            zahvn.textContent = "-";
            zahvl.appendChild(zahvm);
            zahvl.appendChild(zahvn);
            zahvh.appendChild(zahvl);
            this._rows[zahvj[zahvk]] = zahvn;
        }
        document.body.appendChild(zahve);
        this._dom = zahve;
    }
    set(zahva, zahvb) {
        var zahvc = this._rows[zahva];
        if (zahvc && zahvc.textContent !== zahvb) zahvc.textContent = zahvb;
    }
    _collect() {
        var zahva = this.renderer;
        var zahvb = zahva && zahva.info ? zahva.info.render : null;
        if (zahvb) {
            this.set("draws", String(zahvb.calls));
            this.set("triangles", zahvb.triangles > 1e3 ? (zahvb.triangles / 1e3).toFixed(1) + "k" : String(zahvb.triangles));
        }
        var zahvc = zahva && zahva.gl;
        if (zahva && zahva.width) this.set("canvas", zahva.width + " x " + zahva.height);
        if (zahva && zahva.programCache) this.set("programs", String(Object.keys(zahva.programCache).length));
        var zahvd = this._lastScene;
        if (zahvd && zahvd.traverseVisible) {
            var zahve = 0, zahvf = 0;
            zahvd.traverseVisible(function(zahva) {
                zahve++;
                if (zahva.isLight || /Light$/.test(zahva.type || "")) zahvf++;
            });
            this.set("objects", String(zahve));
            this.set("lights", String(zahvf));
        }
        if (typeof performance !== "undefined" && performance.memory) {
            var zahvg = performance.memory.usedJSHeapSize;
            var zahvh = performance.memory.jsHeapSizeLimit;
            this.set("memory", (zahvg / 1048576).toFixed(1) + " / " + (zahvh / 1048576).toFixed(0) + " MB");
        } else if (zahvc && zahvc.getExtension) {
            var zahvb = zahvc.getExtension("WEBGL_debug_renderer_info");
            this.set("memory", zahvb ? "gpu" : "n/a");
        } else {
            this.set("memory", "n/a");
        }
        var zahvi = CrossOrigin.status();
        var zahvj = typeof TaskPool !== "undefined" && TaskPool.instances ? TaskPool.instances.length : 0;
        var zahvk = 0;
        if (typeof TaskPool !== "undefined" && TaskPool.instances) {
            for (var zahvl = 0; zahvl < TaskPool.instances.length; zahvl++) zahvk += TaskPool.instances[zahvl].stats.workers;
        }
        this.set("workers", zahvk + " / " + zahvj + " pools");
        this.set("isolation", zahvi.threads ? "shared" : "fallback");
    }
    _wrapRender() {
        var zahva = this.renderer;
        var zahvb = this;
        if (!zahva || typeof zahva.render !== "function" || zahva.__inspectorWrapped) return;
        var zahvc = zahva.render.bind(zahva);
        zahva.render = function(zahva, zahvd) {
            zahvb._lastScene = zahva;
            return zahvc(zahva, zahvd);
        };
        zahva.__inspectorWrapped = true;
    }
    _drawGraph() {
        var zahva = this._graphContext;
        if (!zahva) return;
        var zahvb = this._graph.width, zahvc = this._graph.height;
        zahva.clearRect(0, 0, zahvb, zahvc);
        if (this._frames.length < 2) return;
        var zahvd = zahvb / (this.maxGraph - 1);
        zahva.beginPath();
        for (var zahve = 0; zahve < this._frames.length; zahve++) {
            var zahvf = this._frames[zahve];
            var zahvg = zahvc - Math.min(zahvf / 33.4, 1) * (zahvc - 2) - 1;
            var zahvh = zahve * zahvd;
            if (zahve === 0) zahva.moveTo(zahvh, zahvg); else zahva.lineTo(zahvh, zahvg);
        }
        zahva.strokeStyle = "#59c2ff";
        zahva.lineWidth = 1.25;
        zahva.stroke();
        zahva.fillStyle = "rgba(89,194,255,0.12)";
        zahva.lineTo((this._frames.length - 1) * zahvd, zahvc);
        zahva.lineTo(0, zahvc);
        zahva.closePath();
        zahva.fill();
        zahva.strokeStyle = "rgba(255,255,255,0.14)";
        zahva.beginPath();
        zahva.moveTo(0, zahvc - Math.min(16.7 / 33.4, 1) * (zahvc - 2) - 1);
        zahva.lineTo(zahvb, zahvc - Math.min(16.7 / 33.4, 1) * (zahvc - 2) - 1);
        zahva.stroke();
    }
    _loop(zahva) {
        if (!this._running) return;
        this._raf = requestAnimationFrame(this._loop);
        if (this._lastFrame) {
            var zahvb = zahva - this._lastFrame;
            this._frames.push(zahvb);
            if (this._frames.length > this.maxGraph) this._frames.shift();
        }
        this._lastFrame = zahva;
        if (this._frames.length >= 8) {
            var zahvc = this._frames.slice().sort(function(zahva, zahvb) {
                return zahva - zahvb;
            });
            var zahvd = zahvc[Math.floor(zahvc.length / 2)];
            this.set("fps", String(Math.min(9999, Math.round(1e3 / Math.max(zahvd, .01)))));
            this.set("frame", zahvd.toFixed(2) + " ms");
            this._drawGraph();
        }
        this._collect();
    }
    toggle() {
        this.hidden = !this.hidden;
        if (this._dom) this._dom.style.display = this.hidden ? "none" : "block";
        return this;
    }
    dispose() {
        this._running = false;
        cancelAnimationFrame(this._raf);
        if (this._dom && this._dom.parentNode) this._dom.parentNode.removeChild(this._dom);
        this._dom = null;
        var zahva = this.renderer;
        if (zahva && zahva.__inspectorWrapped) {
            delete zahva.__inspectorWrapped;
            zahva.render = WebGLRenderer.prototype.render;
        }
        if (zahva && zahva._inspector === this) zahva._inspector = null;
        return this;
    }
}

if (typeof WebGLRenderer !== "undefined" && WebGLRenderer && WebGLRenderer.prototype) {
    WebGLRenderer.prototype.enableInspector = function(zahva) {
        if (!this._inspector) this._inspector = new Inspector(this, zahva);
        return this._inspector;
    };
    WebGLRenderer.prototype.disableInspector = function() {
        if (this._inspector) {
            this._inspector.dispose();
            this._inspector = null;
        }
        return this;
    };
}

export { Inspector };
