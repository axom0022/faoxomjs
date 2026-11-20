var zatya = 40;

class ShaderDX {
    constructor(zatya, zatyb) {
        zatyb = zatyb || {};
        this.renderer = zatya || null;
        this.enabled = true;
        this.panel = zatyb.panel !== false && typeof document !== "undefined";
        this.pollInterval = zatyb.pollInterval === undefined ? 250 : zatyb.pollInterval;
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
            var zatyc = this;
            this._timer = setInterval(function() {
                zatyc.update();
            }, this.pollInterval);
            if (this._timer.unref) this._timer.unref();
        }
    }
    static attach(zatya, zatyb) {
        return new ShaderDX(zatya, zatyb);
    }
    _attach() {
        var zatyb = this;
        var zatyc = this.renderer;
        if (zatyc && zatyc.gl && zatyc.compileShader && !zatyc.__shaderDxPatched) {
            zatyc.__shaderDxPatched = true;
            this._patched = true;
            var zatyd = zatyc.compileShader.bind(zatyc);
            zatyc.compileShader = function(zatya, zatye) {
                var zatyf = zatyd(zatya, zatye);
                if (!zatyf) {
                    var zatyg = zatyc.gl;
                    var zatyh = "unknown compile error";
                    if (zatyg) {
                        var zatyi = zatyg.createShader(zatya);
                        zatyg.shaderSource(zatyi, zatye);
                        zatyg.compileShader(zatyi);
                        zatyh = zatyg.getShaderInfoLog(zatyi) || zatyh;
                        zatyg.deleteShader(zatyi);
                    }
                    zatyb._reportWebGLError(zatya, zatye, zatyh);
                }
                return zatyf;
            };
        }
        var zatye = zatyc && zatyc.device;
        if (zatye && zatye.createShaderModule && !zatye.__shaderDxPatched) {
            zatye.__shaderDxPatched = true;
            this._patched = true;
            var zatyf = zatye.createShaderModule.bind(zatye);
            zatye.createShaderModule = function(zatyc) {
                var zatyd = zatyf(zatyc);
                if (zatyd && typeof zatyd.getCompilationInfo === "function") {
                    zatyd.getCompilationInfo().then(function(zatyd) {
                        var zatye = zatyd && zatyd.messages || [];
                        for (var zatyf = 0; zatyf < zatye.length; zatyf++) {
                            var zatyg = zatye[zatyf];
                            if (zatyg.type === "error") {
                                zatyb._reportWebGPUError(zatyc && zatyc.code, zatyg.lineNum, zatyg.linePos, zatyg.message);
                            } else if (zatyg.type === "warning" && zatyb.errors.length < zatya) {
                                zatyb._pushError({
                                    backend: "webgpu",
                                    kind: "warning",
                                    line: zatyg.lineNum,
                                    column: zatyg.linePos,
                                    text: zatyg.message || "",
                                    source: zatyc && zatyc.code
                                });
                            }
                        }
                    }).catch(function() {});
                }
                return zatyd;
            };
        }
        if (!this._patched) {
            this._patched = false;
        }
    }
    _pushError(zatyb) {
        zatyb.time = Date.now();
        this.errors.push(zatyb);
        if (this.errors.length > zatya) this.errors.shift();
        this._logEvent((zatyb.kind || "error") + " [" + zatyb.backend + "]" + (zatyb.line ? " line " + zatyb.line : "") + ": " + String(zatyb.text || "").slice(0, 140));
    }
    _reportWebGLError(zatya, zatyb, zatyc) {
        var zatyd = ShaderDX.parseGLSLLog(zatyc);
        for (var zatye = 0; zatye < zatyd.length; zatye++) {
            var zatyf = zatyd[zatye];
            this._pushError({
                backend: "webgl",
                kind: "error",
                stage: zatya === 35633 ? "vertex" : "fragment",
                line: zatyf.line,
                text: zatyf.text,
                source: zatyb
            });
        }
        if (!zatyd.length) this._pushError({
            backend: "webgl",
            kind: "error",
            stage: zatya === 35633 ? "vertex" : "fragment",
            text: zatyc,
            source: zatyb
        });
    }
    _reportWebGPUError(zatya, zatyb, zatyc, zatyd) {
        this._pushError({
            backend: "webgpu",
            kind: "error",
            line: zatyb,
            column: zatyc,
            text: zatyd,
            source: zatya
        });
    }
    static parseGLSLLog(zatya) {
        var zatyb = [];
        var zatyc = String(zatya || "").split("\n");
        for (var zatyd = 0; zatyd < zatyc.length; zatyd++) {
            var zatye = zatyc[zatyd].match(/ERROR:\s*\d+:(\d+):\s*(.*)/);
            if (zatye) zatyb.push({
                line: Number(zatye[1]),
                text: zatye[2]
            });
        }
        return zatyb;
    }
    static mapUserLine(zatya, zatyb, zatyc) {
        if (!zatya || !zatyb || !zatyc) return {
            line: zatyc,
            mapped: false
        };
        var zatyd = String(zatyb).slice(0, 64);
        if (!zatyd.trim()) return {
            line: zatyc,
            mapped: false
        };
        var zatye = String(zatya).indexOf(zatyd);
        if (zatye < 0) return {
            line: zatyc,
            mapped: false
        };
        var zatyf = zatya.slice(0, zatye);
        var zatyg = zatyf.split("\n").length - 1;
        return {
            line: zatyc - zatyg,
            mapped: zatyg > 0
        };
    }
    static sourceLineText(zatya, zatyb) {
        if (!zatya || !zatyb) return null;
        var zatyc = String(zatya).split("\n");
        return zatyc[zatyb - 1] !== undefined ? zatyc[zatyb - 1].trim() : null;
    }
    watch(zatya) {
        if (!zatya || zatya.vertexShader === undefined) return this;
        for (var zatyb = 0; zatyb < this.watched.length; zatyb++) if (this.watched[zatyb].material === zatya) return this;
        this.watched.push({
            material: zatya,
            lastGoodVertex: zatya.vertexShader,
            lastGoodFragment: zatya.fragmentShader,
            pendingVertex: zatya.vertexShader,
            pendingFragment: zatya.fragmentShader
        });
        this._logEvent("watching material " + (zatya.type || "ShaderMaterial"));
        return this;
    }
    unwatch(zatya) {
        for (var zatyb = 0; zatyb < this.watched.length; zatyb++) if (this.watched[zatyb].material === zatya) {
            this.watched.splice(zatyb, 1);
            break;
        }
        return this;
    }
    update() {
        if (!this.enabled) return this;
        for (var zatya = 0; zatya < this.watched.length; zatya++) this._updateWatched(this.watched[zatya]);
        this.enrichErrors();
        this._refreshPanel();
        return this;
    }
    _updateWatched(zatya) {
        var zatyb = zatya.material;
        var zatyc = zatyb.vertexShader !== zatya.pendingVertex;
        var zatyd = zatyb.fragmentShader !== zatya.pendingFragment;
        if (!zatyc && !zatyd) return;
        zatya.pendingVertex = zatyb.vertexShader;
        zatya.pendingFragment = zatyb.fragmentShader;
        var zatye = Date.now();
        var zatyf = null;
        if (this.renderer && typeof this.renderer.getShaderProgram === "function") {
            try {
                zatyf = this.renderer.getShaderProgram(zatyb, null);
            } catch (zatya) {
                zatyf = null;
            }
        }
        var zatyg = Date.now() - zatye;
        if (zatyf) {
            zatya.lastGoodVertex = zatyb.vertexShader;
            zatya.lastGoodFragment = zatyb.fragmentShader;
            zatyb.needsUpdate = true;
            this._logEvent("hot reload ok (" + (zatyc ? "vertex" : "") + (zatyc && zatyd ? "+" : "") + (zatyd ? "fragment" : "") + ", " + zatyg + "ms)");
        } else if (this.renderer && this.renderer.gl) {
            zatyb.vertexShader = zatya.lastGoodVertex;
            zatyb.fragmentShader = zatya.lastGoodFragment;
            zatya.pendingVertex = zatya.lastGoodVertex;
            zatya.pendingFragment = zatya.lastGoodFragment;
            zatyb.needsUpdate = true;
            this._logEvent("hot reload FAILED - reverted to last good source (" + zatyg + "ms)");
        } else if (this.renderer && this.renderer.device) {
            if (this.renderer._shaderModuleCache) this.renderer._shaderModuleCache = {};
            if (this.renderer.pipelineCache) this.renderer.pipelineCache = {};
            zatya.lastGoodVertex = zatyb.vertexShader;
            zatya.lastGoodFragment = zatyb.fragmentShader;
            this._logEvent("webgpu shader caches invalidated (" + zatyg + "ms)");
        }
    }
    _logEvent(zatya) {
        this.events.push({
            time: Date.now(),
            text: zatya
        });
        if (this.events.length > 40) this.events.shift();
    }
    _ensurePanel() {
        if (!this.panel || typeof document === "undefined" || !document.body) return;
        if (this._panelElement) return;
        var zatya = document.createElement("div");
        zatya.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:2147483647;max-width:520px;max-height:40vh;overflow:auto;background:rgba(12,12,16,0.92);color:#e8e8e8;font:11px/1.45 ui-monospace,Menlo,Consolas,monospace;border:1px solid #3a3a44;border-radius:6px;padding:8px 10px;pointer-events:auto;white-space:pre-wrap;display:none;";
        var zatyb = document.createElement("div");
        zatyb.textContent = "ShaderDX";
        zatyb.style.cssText = "font-weight:bold;color:#ffb454;margin-bottom:4px;";
        var zatyc = document.createElement("span");
        zatyc.textContent = " [x]";
        zatyc.style.cssText = "cursor:pointer;color:#888;";
        var zatyd = this;
        zatyc.addEventListener("click", function() {
            zatyd.hidePanel();
        });
        zatyb.appendChild(zatyc);
        var zatye = document.createElement("div");
        zatya.appendChild(zatyb);
        zatya.appendChild(zatye);
        document.body.appendChild(zatya);
        this._panelElement = zatya;
        this._panelList = zatye;
    }
    showPanel() {
        this._ensurePanel();
        if (this._panelElement) this._panelElement.style.display = "block";
        return this;
    }
    hidePanel() {
        if (this._panelElement) this._panelElement.style.display = "none";
        return this;
    }
    _refreshPanel() {
        if (!this.panel) return;
        this._ensurePanel();
        if (!this._panelElement) return;
        var zatya = this.errors.filter(function(zatya) {
            return Date.now() - zatya.time < 3e4;
        });
        var zatyb = zatya.length + ":" + (this.events[this.events.length - 1] ? this.events[this.events.length - 1].time : 0);
        if (zatyb === this._lastPanelSignature) return;
        this._lastPanelSignature = zatyb;
        if (!zatya.length && !this.events.length) {
            this._panelElement.style.display = "none";
            return;
        }
        var zatyc = "";
        for (var zatyd = Math.max(0, zatya.length - 8); zatyd < zatya.length; zatyd++) {
            var zatye = zatya[zatyd];
            var zatyf = zatye.userLine !== undefined ? zatye.userLine : zatye.line;
            zatyc += (zatye.kind === "warning" ? "WARN " : "ERROR") + " [" + zatye.backend + (zatye.stage ? " " + zatye.stage : "") + "]" + (zatyf ? " line " + zatyf : "") + ": " + String(zatye.text || "").trim().slice(0, 160) + "\n";
            var zatyg = ShaderDX.sourceLineText(zatye.source, zatye.line);
            if (zatyg) zatyc += '    -> "' + zatyg.slice(0, 100) + '"\n';
        }
        for (var zatyh = Math.max(0, this.events.length - 4); zatyh < this.events.length; zatyh++) zatyc += this.events[zatyh].text + "\n";
        this._panelList.textContent = zatyc;
        if (zatya.length) this._panelElement.style.display = "block";
    }
    enrichErrors() {
        for (var zatya = 0; zatya < this.errors.length; zatya++) {
            var zatyb = this.errors[zatya];
            if (zatyb.userLine !== undefined || !zatyb.source) continue;
            for (var zatyc = 0; zatyc < this.watched.length; zatyc++) {
                var zatyd = this.watched[zatyc];
                var zatye = zatyb.stage === "vertex" ? zatyd.pendingVertex : zatyd.pendingFragment;
                if (!zatye) continue;
                var zatyf = ShaderDX.mapUserLine(zatyb.source, zatye, zatyb.line);
                if (zatyf.mapped) {
                    zatyb.userLine = zatyf.line;
                    break;
                }
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
