// ShaderDX - shader developer experience (roadmap item 18).
//
// * captures shader compile errors from both backends (WebGL info logs,
//   WebGPU compilationInfo) instead of letting them vanish silently;
// * maps driver error lines back to the user's original shader source
//   (the engine injects a preamble before user code, which shifts lines);
// * dev-mode hot reload for watched ShaderMaterials: polls source strings,
//   recompiles, and on failure reverts to the last good source so the
//   scene keeps rendering while the error is shown in the panel;
// * in-canvas error panel (code-driven DOM overlay, no assets).

var DX_ERROR_LIMIT = 40;

class ShaderDX {
    constructor(renderer, options) {
        options = options || {};
        this.renderer = renderer || null;
        this.enabled = true;
        this.panel = options.panel !== false && typeof document !== "undefined";
        this.pollInterval = options.pollInterval === undefined ? 250 : options.pollInterval;
        this.errors = [];
        this.events = [];
        this.watched = [];
        this._timer = null;
        this._patched = false;
        this._panelElement = null;
        this._panelList = null;
        this._lastPanelSignature = "";
        if (this.renderer) this._attach();
        if (this.pollInterval > 0 && typeof setInterval === "function") {
            var self = this;
            this._timer = setInterval(function() { self.update(); }, this.pollInterval);
            if (this._timer.unref) this._timer.unref();
        }
    }

    static attach(renderer, options) { return new ShaderDX(renderer, options); }

    // ------------------------------------------------------------------
    // attachment + error capture
    // ------------------------------------------------------------------
    _attach() {
        var self = this;
        var renderer = this.renderer;
        if (renderer && renderer.gl && renderer.compileShader && !renderer.__shaderDxPatched) {
            renderer.__shaderDxPatched = true;
            this._patched = true;
            var original = renderer.compileShader.bind(renderer);
            renderer.compileShader = function(type, source) {
                var shader = original(type, source);
                if (!shader) {
                    var gl = renderer.gl;
                    var log = "unknown compile error";
                    if (gl) {
                        var probe = gl.createShader(type);
                        gl.shaderSource(probe, source);
                        gl.compileShader(probe);
                        log = gl.getShaderInfoLog(probe) || log;
                        gl.deleteShader(probe);
                    }
                    self._reportWebGLError(type, source, log);
                }
                return shader;
            };
        }
        var device = renderer && renderer.device;
        if (device && device.createShaderModule && !device.__shaderDxPatched) {
            device.__shaderDxPatched = true;
            this._patched = true;
            var originalModule = device.createShaderModule.bind(device);
            device.createShaderModule = function(descriptor) {
                var module = originalModule(descriptor);
                if (module && typeof module.getCompilationInfo === "function") {
                    module.getCompilationInfo().then(function(info) {
                        var messages = (info && info.messages) || [];
                        for (var i = 0; i < messages.length; i++) {
                            var message = messages[i];
                            if (message.type === "error") {
                                self._reportWebGPUError(descriptor && descriptor.code, message.lineNum, message.linePos, message.message);
                            } else if (message.type === "warning" && self.errors.length < DX_ERROR_LIMIT) {
                                self._pushError({ backend: "webgpu", kind: "warning", line: message.lineNum, column: message.linePos, text: message.message || "", source: descriptor && descriptor.code });
                            }
                        }
                    }).catch(function() { /* compilation info unavailable */ });
                }
                return module;
            };
        }
        if (!this._patched) {
            // node / test environments without a live GPU context
            this._patched = false;
        }
    }

    _pushError(error) {
        error.time = Date.now();
        this.errors.push(error);
        if (this.errors.length > DX_ERROR_LIMIT) this.errors.shift();
        this._logEvent((error.kind || "error") + " [" + error.backend + "]" + (error.line ? " line " + error.line : "") + ": " + String(error.text || "").slice(0, 140));
    }

    _reportWebGLError(type, source, log) {
        var parsed = ShaderDX.parseGLSLLog(log);
        for (var i = 0; i < parsed.length; i++) {
            var entry = parsed[i];
            this._pushError({ backend: "webgl", kind: "error", stage: type === 35633 ? "vertex" : "fragment", line: entry.line, text: entry.text, source: source });
        }
        if (!parsed.length) this._pushError({ backend: "webgl", kind: "error", stage: type === 35633 ? "vertex" : "fragment", text: log, source: source });
    }

    _reportWebGPUError(code, line, column, message) {
        this._pushError({ backend: "webgpu", kind: "error", line: line, column: column, text: message, source: code });
    }

    // "ERROR: 0:12: 'foo' : undeclared identifier" -> [{line:12, text:...}]
    static parseGLSLLog(log) {
        var results = [];
        var lines = String(log || "").split("\n");
        for (var i = 0; i < lines.length; i++) {
            var match = lines[i].match(/ERROR:\s*\d+:(\d+):\s*(.*)/);
            if (match) results.push({ line: Number(match[1]), text: match[2] });
        }
        return results;
    }

    // ------------------------------------------------------------------
    // line mapping back to user source
    // ------------------------------------------------------------------
    // The engine prepends defines + auto-declared attributes/uniforms before
    // the user's shader text, so driver line numbers are shifted. If we can
    // find the user source inside the processed source, report the offset.
    static mapUserLine(processedSource, userSource, errorLine) {
        if (!processedSource || !userSource || !errorLine) return { line: errorLine, mapped: false };
        var anchor = String(userSource).slice(0, 64);
        if (!anchor.trim()) return { line: errorLine, mapped: false };
        var at = String(processedSource).indexOf(anchor);
        if (at < 0) return { line: errorLine, mapped: false };
        var prefix = processedSource.slice(0, at);
        var preambleLines = prefix.split("\n").length - 1;
        return { line: errorLine - preambleLines, mapped: preambleLines > 0 };
    }

    static sourceLineText(source, line) {
        if (!source || !line) return null;
        var lines = String(source).split("\n");
        return lines[line - 1] !== undefined ? lines[line - 1].trim() : null;
    }

    // ------------------------------------------------------------------
    // hot reload
    // ------------------------------------------------------------------
    watch(material) {
        if (!material || material.vertexShader === undefined) return this;
        for (var i = 0; i < this.watched.length; i++) if (this.watched[i].material === material) return this;
        this.watched.push({
            material: material,
            lastGoodVertex: material.vertexShader,
            lastGoodFragment: material.fragmentShader,
            pendingVertex: material.vertexShader,
            pendingFragment: material.fragmentShader
        });
        this._logEvent("watching material " + (material.type || "ShaderMaterial"));
        return this;
    }

    unwatch(material) {
        for (var i = 0; i < this.watched.length; i++) if (this.watched[i].material === material) { this.watched.splice(i, 1); break; }
        return this;
    }

    update() {
        if (!this.enabled) return this;
        for (var i = 0; i < this.watched.length; i++) this._updateWatched(this.watched[i]);
        this.enrichErrors();
        this._refreshPanel();
        return this;
    }

    _updateWatched(entry) {
        var material = entry.material;
        var vertexChanged = material.vertexShader !== entry.pendingVertex;
        var fragmentChanged = material.fragmentShader !== entry.pendingFragment;
        if (!vertexChanged && !fragmentChanged) return;
        entry.pendingVertex = material.vertexShader;
        entry.pendingFragment = material.fragmentShader;
        var started = Date.now();
        // try to compile the new sources through the real renderer path
        var program = null;
        if (this.renderer && typeof this.renderer.getShaderProgram === "function") {
            try { program = this.renderer.getShaderProgram(material, null); } catch (error) { program = null; }
        }
        var elapsed = Date.now() - started;
        if (program) {
            entry.lastGoodVertex = material.vertexShader;
            entry.lastGoodFragment = material.fragmentShader;
            material.needsUpdate = true;
            this._logEvent("hot reload ok (" + (vertexChanged ? "vertex" : "") + (vertexChanged && fragmentChanged ? "+" : "") + (fragmentChanged ? "fragment" : "") + ", " + elapsed + "ms)");
        } else if (this.renderer && this.renderer.gl) {
            // WebGL: compilation failed - revert so the scene keeps rendering
            material.vertexShader = entry.lastGoodVertex;
            material.fragmentShader = entry.lastGoodFragment;
            entry.pendingVertex = entry.lastGoodVertex;
            entry.pendingFragment = entry.lastGoodFragment;
            material.needsUpdate = true;
            this._logEvent("hot reload FAILED - reverted to last good source (" + elapsed + "ms)");
        } else if (this.renderer && this.renderer.device) {
            // WebGPU: pipeline/module caches are rebuilt lazily on the next
            // draw; a failed module surfaces through compilationInfo.
            if (this.renderer._shaderModuleCache) this.renderer._shaderModuleCache = {};
            if (this.renderer.pipelineCache) this.renderer.pipelineCache = {};
            entry.lastGoodVertex = material.vertexShader;
            entry.lastGoodFragment = material.fragmentShader;
            this._logEvent("webgpu shader caches invalidated (" + elapsed + "ms)");
        }
    }

    _logEvent(text) {
        this.events.push({ time: Date.now(), text: text });
        if (this.events.length > 40) this.events.shift();
    }

    // ------------------------------------------------------------------
    // in-canvas panel
    // ------------------------------------------------------------------
    _ensurePanel() {
        if (!this.panel || typeof document === "undefined" || !document.body) return;
        if (this._panelElement) return;
        var element = document.createElement("div");
        element.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:2147483647;max-width:520px;max-height:40vh;overflow:auto;background:rgba(12,12,16,0.92);color:#e8e8e8;font:11px/1.45 ui-monospace,Menlo,Consolas,monospace;border:1px solid #3a3a44;border-radius:6px;padding:8px 10px;pointer-events:auto;white-space:pre-wrap;display:none;";
        var title = document.createElement("div");
        title.textContent = "ShaderDX";
        title.style.cssText = "font-weight:bold;color:#ffb454;margin-bottom:4px;";
        var close = document.createElement("span");
        close.textContent = " [x]";
        close.style.cssText = "cursor:pointer;color:#888;";
        var self = this;
        close.addEventListener("click", function() { self.hidePanel(); });
        title.appendChild(close);
        var list = document.createElement("div");
        element.appendChild(title);
        element.appendChild(list);
        document.body.appendChild(element);
        this._panelElement = element;
        this._panelList = list;
    }

    showPanel() { this._ensurePanel(); if (this._panelElement) this._panelElement.style.display = "block"; return this; }
    hidePanel() { if (this._panelElement) this._panelElement.style.display = "none"; return this; }

    _refreshPanel() {
        if (!this.panel) return;
        this._ensurePanel();
        if (!this._panelElement) return;
        var recentErrors = this.errors.filter(function(e) { return Date.now() - e.time < 30000; });
        var signature = recentErrors.length + ":" + (this.events[this.events.length - 1] ? this.events[this.events.length - 1].time : 0);
        if (signature === this._lastPanelSignature) return;
        this._lastPanelSignature = signature;
        if (!recentErrors.length && !this.events.length) { this._panelElement.style.display = "none"; return; }
        var text = "";
        for (var i = Math.max(0, recentErrors.length - 8); i < recentErrors.length; i++) {
            var error = recentErrors[i];
            var mapped = error.userLine !== undefined ? error.userLine : error.line;
            text += (error.kind === "warning" ? "WARN " : "ERROR") + " [" + error.backend + (error.stage ? " " + error.stage : "") + "]"
                + (mapped ? " line " + mapped : "") + ": " + String(error.text || "").trim().slice(0, 160) + "\n";
            var lineText = ShaderDX.sourceLineText(error.source, error.line);
            if (lineText) text += "    -> \"" + lineText.slice(0, 100) + "\"\n";
        }
        for (var j = Math.max(0, this.events.length - 4); j < this.events.length; j++) text += this.events[j].text + "\n";
        this._panelList.textContent = text;
        if (recentErrors.length) this._panelElement.style.display = "block";
    }

    // enrich errors with mapped user lines for watched materials
    enrichErrors() {
        for (var i = 0; i < this.errors.length; i++) {
            var error = this.errors[i];
            if (error.userLine !== undefined || !error.source) continue;
            for (var w = 0; w < this.watched.length; w++) {
                var entry = this.watched[w];
                var userSource = error.stage === "vertex" ? entry.pendingVertex : entry.pendingFragment;
                if (!userSource) continue;
                var mapping = ShaderDX.mapUserLine(error.source, userSource, error.line);
                if (mapping.mapped) { error.userLine = mapping.line; break; }
            }
        }
        return this.errors;
    }

    dispose() {
        if (this._timer && typeof clearInterval === "function") clearInterval(this._timer);
        this._timer = null;
        if (this._panelElement && this._panelElement.parentNode) this._panelElement.parentNode.removeChild(this._panelElement);
        this._panelElement = null;
        this._panelList = null;
        this.watched = [];
        this.enabled = false;
        return this;
    }
}

export { ShaderDX };
