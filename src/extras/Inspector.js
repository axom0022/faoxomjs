// Inspector - zero dependency overlay panel with live engine stats:
// fps graph, frame time, draw calls, triangles, GPU buffer and texture
// budgets, memory pressure, worker/isolation status and scene counts.
// Toggled with renderer.enableInspector() / disableInspector().

import { WebGLRenderer } from "../renderers/index.js";
import { CrossOrigin } from "./CrossOrigin.js";
import { TaskPool } from "./TaskPool.js";

var INSPECTOR_STYLE = [
    "position:fixed", "top:12px", "left:12px", "z-index:2147483647",
    "font:11px/1.5 ui-monospace,Menlo,Consolas,monospace",
    "color:#d7dde8", "background:rgba(10,13,20,0.88)",
    "border:1px solid #2b3446", "border-radius:8px",
    "padding:8px 10px", "min-width:230px", "pointer-events:none",
    "user-select:none", "-webkit-user-select:none"
].join(";");

var ROW_STYLE = "display:flex;justify-content:space-between;gap:14px";
var LABEL_STYLE = "color:#7d8aa5";
var VALUE_STYLE = "color:#8fd3ff;font-weight:600;white-space:nowrap";

class Inspector {
    constructor(renderer, options) {
        options = options || {};
        this.renderer = renderer;
        this.expand = options.expand !== false;
        this.maxGraph = options.graph || 120;
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
        var panel = document.createElement("div");
        panel.setAttribute("style", INSPECTOR_STYLE);
        var title = document.createElement("div");
        title.setAttribute("style", "font-weight:700;color:#e8edf6;margin-bottom:4px;letter-spacing:0.4px");
        title.textContent = "FAOXOM INSPECTOR";
        panel.appendChild(title);
        var graph = document.createElement("canvas");
        graph.width = 220;
        graph.height = 36;
        graph.setAttribute("style", "display:block;width:220px;height:36px;margin:2px 0 6px;background:#0a0d14;border-radius:4px");
        panel.appendChild(graph);
        this._graph = graph;
        this._graphContext = graph.getContext("2d");
        var body = document.createElement("div");
        panel.appendChild(body);
        this._body = body;
        var self = this;
        var rows = ["fps", "frame", "draws", "triangles", "canvas", "textures", "programs", "memory", "objects", "lights", "workers", "isolation"];
        for (var i = 0; i < rows.length; i++) {
            var row = document.createElement("div");
            row.setAttribute("style", ROW_STYLE);
            var label = document.createElement("span");
            label.setAttribute("style", LABEL_STYLE);
            label.textContent = rows[i];
            var value = document.createElement("span");
            value.setAttribute("style", VALUE_STYLE);
            value.textContent = "-";
            row.appendChild(label);
            row.appendChild(value);
            body.appendChild(row);
            this._rows[rows[i]] = value;
        }
        document.body.appendChild(panel);
        this._dom = panel;
    }

    set(key, text) {
        var row = this._rows[key];
        if (row && row.textContent !== text) row.textContent = text;
    }

    _collect() {
        var renderer = this.renderer;
        var info = renderer && renderer.info ? renderer.info.render : null;
        if (info) {
            this.set("draws", String(info.calls));
            this.set("triangles", info.triangles > 1000 ? (info.triangles / 1000).toFixed(1) + "k" : String(info.triangles));
        }
        var gl = renderer && renderer.gl;
        if (renderer && renderer.width) this.set("canvas", renderer.width + " x " + renderer.height);
        if (renderer && renderer.programCache) this.set("programs", String(Object.keys(renderer.programCache).length));
        var scene = this._lastScene;
        if (scene && scene.traverseVisible) {
            var objects = 0, lights = 0;
            scene.traverseVisible(function (node) {
                objects++;
                if (node.isLight || /Light$/.test(node.type || "")) lights++;
            });
            this.set("objects", String(objects));
            this.set("lights", String(lights));
        }
        if (typeof performance !== "undefined" && performance.memory) {
            var used = performance.memory.usedJSHeapSize;
            var limit = performance.memory.jsHeapSizeLimit;
            this.set("memory", (used / 1048576).toFixed(1) + " / " + (limit / 1048576).toFixed(0) + " MB");
        } else if (gl && gl.getExtension) {
            var info = gl.getExtension("WEBGL_debug_renderer_info");
            this.set("memory", info ? "gpu" : "n/a");
        } else {
            this.set("memory", "n/a");
        }
        var status = CrossOrigin.status();
        var pools = typeof TaskPool !== "undefined" && TaskPool.instances ? TaskPool.instances.length : 0;
        var workers = 0;
        if (typeof TaskPool !== "undefined" && TaskPool.instances) {
            for (var p = 0; p < TaskPool.instances.length; p++) workers += TaskPool.instances[p].stats.workers;
        }
        this.set("workers", workers + " / " + pools + " pools");
        this.set("isolation", status.threads ? "shared" : "fallback");
    }

    _wrapRender() {
        var renderer = this.renderer;
        var self = this;
        if (!renderer || typeof renderer.render !== "function" || renderer.__inspectorWrapped) return;
        var original = renderer.render.bind(renderer);
        renderer.render = function (scene, camera) {
            self._lastScene = scene;
            return original(scene, camera);
        };
        renderer.__inspectorWrapped = true;
    }

    _drawGraph() {
        var context = this._graphContext;
        if (!context) return;
        var width = this._graph.width, height = this._graph.height;
        context.clearRect(0, 0, width, height);
        if (this._frames.length < 2) return;
        var step = width / (this.maxGraph - 1);
        context.beginPath();
        for (var i = 0; i < this._frames.length; i++) {
            var ms = this._frames[i];
            var y = height - Math.min(ms / 33.4, 1) * (height - 2) - 1;
            var x = i * step;
            if (i === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
        }
        context.strokeStyle = "#59c2ff";
        context.lineWidth = 1.25;
        context.stroke();
        context.fillStyle = "rgba(89,194,255,0.12)";
        context.lineTo((this._frames.length - 1) * step, height);
        context.lineTo(0, height);
        context.closePath();
        context.fill();
        // 60fps line
        context.strokeStyle = "rgba(255,255,255,0.14)";
        context.beginPath();
        context.moveTo(0, height - Math.min(16.7 / 33.4, 1) * (height - 2) - 1);
        context.lineTo(width, height - Math.min(16.7 / 33.4, 1) * (height - 2) - 1);
        context.stroke();
    }

    _loop(now) {
        if (!this._running) return;
        this._raf = requestAnimationFrame(this._loop);
        if (this._lastFrame) {
            var delta = now - this._lastFrame;
            this._frames.push(delta);
            if (this._frames.length > this.maxGraph) this._frames.shift();
        }
        this._lastFrame = now;
        if (this._frames.length >= 8) {
            var sorted = this._frames.slice().sort(function (a, b) { return a - b; });
            var median = sorted[Math.floor(sorted.length / 2)];
            this.set("fps", String(Math.min(9999, Math.round(1000 / Math.max(median, 0.01)))));
            this.set("frame", median.toFixed(2) + " ms");
            this._drawGraph();
        }
        this._collect();
    }

    toggle() { this.hidden = !this.hidden; if (this._dom) this._dom.style.display = this.hidden ? "none" : "block"; return this; }

    dispose() {
        this._running = false;
        cancelAnimationFrame(this._raf);
        if (this._dom && this._dom.parentNode) this._dom.parentNode.removeChild(this._dom);
        this._dom = null;
        var renderer = this.renderer;
        if (renderer && renderer.__inspectorWrapped) {
            delete renderer.__inspectorWrapped;
            renderer.render = WebGLRenderer.prototype.render;
        }
        if (renderer && renderer._inspector === this) renderer._inspector = null;
        return this;
    }
}

// Wired into WebGLRenderer via prototype registration so core never imports
// extras (no module cycle, works in the single file build too).
if (typeof WebGLRenderer !== "undefined" && WebGLRenderer && WebGLRenderer.prototype) {
    WebGLRenderer.prototype.enableInspector = function (options) {
        if (!this._inspector) this._inspector = new Inspector(this, options);
        return this._inspector;
    };
    WebGLRenderer.prototype.disableInspector = function () {
        if (this._inspector) { this._inspector.dispose(); this._inspector = null; }
        return this;
    };
}

export { Inspector };
