var zasra = {
    MAP_READ: 1,
    COPY_DST: 8,
    COPY_SRC: 4,
    QUERY_RESOLVE: 512
};

var zasrb = [ "#4fc3f7", "#ffb74d", "#81c784", "#e57373", "#ba68c8", "#fff176", "#4db6ac", "#f06292" ];

class FrameProfiler {
    constructor(zasra, zasrb) {
        zasrb = zasrb || {};
        this.renderer = zasra || null;
        this.enabled = zasrb.enabled !== false;
        this.overlay = zasrb.overlay !== false && typeof document !== "undefined";
        this.overlayTarget = zasrb.overlayTarget || null;
        this.historyLength = zasrb.history || 120;
        this.maxPasses = zasrb.maxPasses || 16;
        this.gpuTimestamps = zasrb.gpuTimestamps !== false;
        this.timestampPeriod = zasrb.timestampPeriod !== undefined ? zasrb.timestampPeriod : null;
        this.ledger = zasrb.ledger || null;
        this.history = [];
        this.stats = {
            frames: 0,
            sampled: 0,
            gpuFrames: 0,
            cpuFrames: 0,
            avgGpuMs: 0,
            avgFps: 0
        };
        this.frame = null;
        this.lastReadback = null;
        this._inFrame = false;
        this._querySet = null;
        this._resolveBuffer = null;
        this._staging = null;
        this._stagingIndex = 0;
        this._slot = 0;
        this._pending = false;
        this._watchedDevice = null;
        this._gpuTimers = false;
        this._lastFrameAt = 0;
        this._fpsEMA = -1;
        this._overlayCanvas = null;
        this._overlayContext = null;
        this._disposed = false;
    }
    _now() {
        return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    }
    _nowUs() {
        return Math.round(this._now() * 1e3);
    }
    _period() {
        if (this.timestampPeriod !== null) return this.timestampPeriod;
        var zasra = this.renderer && this.renderer.adapter;
        var zasrb = zasra && zasra.info;
        return zasrb && typeof zasrb.timestampPeriod === "number" ? zasrb.timestampPeriod : 1;
    }
    _watchDevice() {
        var zasrb = this.renderer && this.renderer.device;
        if (!zasrb || zasrb === this._watchedDevice) return;
        this._watchedDevice = zasrb;
        this._gpuTimers = false;
        this._querySet = null;
        if (!this.gpuTimestamps) return;
        var zasrc = zasrb.features;
        var zasrd = false;
        try {
            zasrd = !!(zasrc && zasrc.has && zasrc.has("timestamp-query"));
        } catch (zasra) {
            zasrd = false;
        }
        if (!zasrd) return;
        var zasre = this.maxPasses * 2;
        try {
            this._querySet = zasrb.createQuerySet({
                type: "timestamp",
                count: zasre
            });
            this._resolveBuffer = zasrb.createBuffer({
                size: zasre * 8,
                usage: zasra.QUERY_RESOLVE | zasra.COPY_SRC
            });
            this._staging = [ zasrb.createBuffer({
                size: zasre * 8,
                usage: zasra.MAP_READ | zasra.COPY_DST
            }), zasrb.createBuffer({
                size: zasre * 8,
                usage: zasra.MAP_READ | zasra.COPY_DST
            }) ];
            this._gpuTimers = true;
        } catch (zasra) {
            this._gpuTimers = false;
            this._querySet = null;
        }
    }
    passDescriptor(zasra, zasrb) {
        if (!this.enabled || this._disposed) return zasrb;
        if (!this._inFrame) this.beginFrame();
        var zasrc = {
            name: zasra,
            gpuMs: null,
            cpuMs: null,
            cpuStart: this._now()
        };
        if (this.frame.passes.length) {
            var zasrd = this.frame.passes[this.frame.passes.length - 1];
            if (zasrd.cpuStart !== null && zasrd.cpuMs === null) zasrd.cpuMs = Math.max(0, zasrc.cpuStart - zasrd.cpuStart);
        }
        this.frame.passes.push(zasrc);
        if (this._gpuTimers && this._slot < this.maxPasses) {
            zasrb = Object.assign({}, zasrb);
            zasrb.timestampWrites = {
                querySet: this._querySet,
                beginningOfPassWriteIndex: this._slot * 2,
                endOfPassWriteIndex: this._slot * 2 + 1
            };
            zasrc.slot = this._slot;
            this._slot++;
        }
        return zasrb;
    }
    beginFrame() {
        if (!this.enabled || this._disposed) return this;
        this._watchDevice();
        var zasra = this._now();
        if (this._lastFrameAt > 0) {
            var zasrb = zasra - this._lastFrameAt;
            if (zasrb > 0 && zasrb < 1e3) this._fpsEMA = this._fpsEMA < 0 ? 1e3 / zasrb : this._fpsEMA + .1 * (1e3 / zasrb - this._fpsEMA);
        }
        this._lastFrameAt = zasra;
        this.frame = {
            frame: this.stats.frames,
            tsUs: this._nowUs(),
            passes: [],
            totalGpuMs: 0,
            totalCpuMs: 0,
            draws: 0,
            triangles: 0,
            pipelines: 0,
            ledger: null,
            fps: this._fpsEMA < 0 ? 0 : this._fpsEMA,
            source: null
        };
        this._slot = 0;
        this._inFrame = true;
        return this;
    }
    resolve(zasra) {
        if (!this.enabled || this._disposed || !this._gpuTimers || !this.frame || this._slot === 0) return;
        var zasrb = this._slot * 2;
        var zasrc = zasrb * 8;
        this._stagingIndex = 1 - this._stagingIndex;
        var zasrd = this._staging[this._stagingIndex];
        zasra.resolveQuerySet(this._querySet, 0, zasrb, this._resolveBuffer, 0);
        zasra.copyBufferToBuffer(this._resolveBuffer, 0, zasrd, 0, zasrc);
        this.frame._staging = zasrd;
        this.frame._byteSize = zasrc;
        return this;
    }
    endFrame(zasra) {
        if (!this.enabled || this._disposed || !this.frame) return this;
        var zasrb = this.renderer || zasra;
        var zasrc = this.frame.passes[this.frame.passes.length - 1];
        if (zasrc && zasrc.cpuStart !== null && zasrc.cpuMs === null) zasrc.cpuMs = Math.max(0, this._now() - zasrc.cpuStart);
        if (zasrb && zasrb.info) {
            this.frame.draws = zasrb.info.render.calls;
            this.frame.triangles = zasrb.info.render.triangles;
        }
        if (zasrb && zasrb.pipelineCache) this.frame.pipelines = Object.keys(zasrb.pipelineCache).length;
        var zasrd = this.ledger || zasrb && zasrb.ledger;
        if (zasrd && typeof zasrd.snapshot === "function") {
            try {
                this.frame.ledger = zasrd.snapshot();
            } catch (zasra) {
                this.frame.ledger = null;
            }
        }
        var zasre = this._readTimestamps();
        if (zasre) this.frame.gpuReadback = zasre; else {
            this._finishFrame();
        }
        this._inFrame = false;
        return this;
    }
    _readTimestamps() {
        var zasra = this.frame;
        if (!this._gpuTimers || !zasra || !zasra._staging || this._pending) return null;
        var zasrb = zasra._staging;
        var zasrc = zasra._byteSize;
        var zasrd = this;
        this._pending = true;
        var zasre = zasrb.mapAsync(1).then(function() {
            var zasre = new BigInt64Array(zasrb.getMappedRange(), 0, zasrc / 8);
            var zasrf = zasrd._period();
            for (var zasrg = 0; zasrg < zasra.passes.length; zasrg++) {
                var zasrh = zasra.passes[zasrg];
                if (zasrh.slot === undefined || zasrh.slot === null) continue;
                var zasri = Number(zasre[zasrh.slot * 2]);
                var zasrj = Number(zasre[zasrh.slot * 2 + 1]);
                if (zasrj >= zasri) zasrh.gpuMs = (zasrj - zasri) * zasrf / 1e6;
            }
            zasrb.unmap();
        }).catch(function() {}).then(function() {
            zasrd._pending = false;
            zasrd._finishFrame();
        });
        this.lastReadback = zasre;
        return zasre;
    }
    _finishFrame() {
        var zasra = this.frame;
        if (!zasra) return;
        zasra.totalGpuMs = 0;
        zasra.totalCpuMs = 0;
        for (var zasrb = 0; zasrb < zasra.passes.length; zasrb++) {
            zasra.totalGpuMs += zasra.passes[zasrb].gpuMs || 0;
            zasra.totalCpuMs += zasra.passes[zasrb].cpuMs || 0;
        }
        zasra.source = this._gpuTimers ? "gpu" : "cpu";
        this.stats.frames++;
        if (zasra.source === "gpu") this.stats.gpuFrames++; else this.stats.cpuFrames++;
        this.stats.sampled++;
        var zasrc = this.stats.sampled;
        this.stats.avgGpuMs = this.stats.avgGpuMs + (zasra.totalGpuMs - this.stats.avgGpuMs) / zasrc;
        this.stats.avgFps = zasra.fps || this.stats.avgFps;
        this.history.push(zasra);
        if (this.history.length > this.historyLength) this.history.splice(0, this.history.length - this.historyLength);
        if (this.overlay) this._drawOverlay();
    }
    _ensureOverlay() {
        if (this._overlayCanvas || !this.overlay || typeof document === "undefined") return this._overlayCanvas;
        try {
            var zasra = document.createElement("canvas");
            zasra.width = 360;
            zasra.height = 190;
            zasra.style.cssText = "position:absolute;left:8px;top:8px;width:360px;height:190px;pointer-events:none;z-index:2147483647;background:rgba(8,12,18,0.72);font:10px monospace;";
            var zasrb = this.renderer;
            var zasrc = this.overlayTarget || zasrb && zasrb.canvas && zasrb.canvas.parentNode || document.body;
            if (zasrc === document.body) zasra.style.position = "fixed";
            zasrc.appendChild(zasra);
            this._overlayCanvas = zasra;
            this._overlayContext = zasra.getContext && zasra.getContext("2d") ? zasra.getContext("2d") : null;
        } catch (zasra) {
            this.overlay = false;
        }
        return this._overlayCanvas;
    }
    _drawOverlay() {
        var zasra = this._ensureOverlay();
        var zasrc = this._overlayContext;
        if (!zasra || !zasrc) return;
        try {
            zasrc.clearRect(0, 0, zasra.width, zasra.height);
            zasrc.font = "10px monospace";
            var zasrd = this.history[this.history.length - 1];
            if (!zasrd) return;
            zasrc.fillStyle = "#9be29b";
            zasrc.fillText("faoxom profiler - " + zasrd.source + " timestamps", 8, 14);
            zasrc.fillStyle = "#dddddd";
            zasrc.fillText("fps " + (zasrd.fps ? zasrd.fps.toFixed(1) : "--") + "  gpu " + (zasrd.source === "gpu" ? zasrd.totalGpuMs.toFixed(3) + "ms" : "n/a") + "  cpu " + zasrd.totalCpuMs.toFixed(2) + "ms", 8, 28);
            zasrc.fillText("draws " + zasrd.draws + "  tris " + zasrd.triangles + "  pipelines " + zasrd.pipelines, 8, 42);
            var zasre = "ledger: off";
            if (zasrd.ledger) {
                var zasrf = zasrd.ledger.live || {};
                var zasrg = zasrd.ledger.totalBytes || 0;
                zasre = "buffers " + (zasrf.buffer || 0) + "  textures " + (zasrf.texture || 0) + "  " + (zasrg / 1048576).toFixed(2) + " MiB";
            }
            zasrc.fillText(zasre, 8, 56);
            var zasrh = Math.min(60, this.history.length);
            var zasri = 90;
            var zasrj = 90;
            var zasrk = .001;
            for (var zasrl = this.history.length - zasrh; zasrl < this.history.length; zasrl++) {
                var zasrm = this.history[zasrl];
                var zasrn = (zasrm.source === "gpu" ? zasrm.totalGpuMs : zasrm.totalCpuMs) || 0;
                if (zasrn > zasrk) zasrk = zasrn;
            }
            zasrc.fillStyle = "#666666";
            zasrc.fillText("pass timeline (peak " + zasrk.toFixed(2) + "ms)", 8, zasrj - 4);
            for (var zasro = 0; zasro < zasrh; zasro++) {
                var zasrp = this.history.length - zasrh + zasro;
                var zasrq = this.history[zasrp];
                var zasrr = 8 + zasro * 5.7;
                var zasrs = zasrj;
                for (var zasrt = 0; zasrt < zasrq.passes.length; zasrt++) {
                    var zasru = zasrq.passes[zasrt];
                    var zasrv = (zasru.gpuMs !== null ? zasru.gpuMs : zasru.cpuMs) || 0;
                    var zasrw = zasrv / zasrk * zasri;
                    zasrc.fillStyle = zasrb[zasrt % zasrb.length];
                    zasrc.fillRect(zasrr, zasrs, 4, -zasrw);
                    zasrs -= zasrw;
                }
            }
            for (var zasrx = 0; zasrx < Math.min(6, zasrd.passes.length); zasrx++) {
                zasrc.fillStyle = zasrb[zasrx % zasrb.length];
                zasrc.fillText(zasrd.passes[zasrx].name + " " + ((zasrd.passes[zasrx].gpuMs !== null ? zasrd.passes[zasrx].gpuMs : zasrd.passes[zasrx].cpuMs) || 0).toFixed(3) + "ms", 8, 186 - (Math.min(6, zasrd.passes.length) - 1 - zasrx) * 11);
            }
        } catch (zasra) {}
    }
    exportTrace() {
        var zasra = [];
        for (var zasrb = 0; zasrb < this.history.length; zasrb++) {
            var zasrc = this.history[zasrb];
            var zasrd = zasrc.tsUs;
            var zasre = zasrd;
            for (var zasrf = 0; zasrf < zasrc.passes.length; zasrf++) {
                var zasrg = zasrc.passes[zasrf];
                var zasrh = Math.round(((zasrg.gpuMs !== null ? zasrg.gpuMs : zasrg.cpuMs) || 0) * 1e3);
                zasra.push({
                    name: "pass/" + zasrg.name,
                    cat: "faoxom",
                    ph: "X",
                    ts: zasre,
                    dur: zasrh,
                    pid: 1,
                    tid: 2,
                    args: {
                        frame: zasrc.frame,
                        timing: zasrg.gpuMs !== null ? "gpu" : "cpu"
                    }
                });
                zasre += zasrh;
            }
            zasra.push({
                name: "frame",
                cat: "faoxom.counters",
                ph: "C",
                ts: zasrd,
                pid: 1,
                tid: 1,
                args: {
                    fps: Math.round((zasrc.fps || 0) * 10) / 10,
                    draws: zasrc.draws,
                    triangles: zasrc.triangles,
                    gpuMs: Math.round(zasrc.totalGpuMs * 1e3) / 1e3
                }
            });
        }
        return {
            traceEvents: zasra,
            otherData: {
                generator: "FaoxomJs FrameProfiler",
                frames: this.stats.frames,
                source: this._gpuTimers ? "gpu" : "cpu"
            }
        };
    }
    downloadTrace(zasra) {
        if (typeof document === "undefined" || !document.createElement) return null;
        var zasrb = this.exportTrace();
        var zasrc = new Blob([ JSON.stringify(zasrb) ], {
            type: "application/json"
        });
        var zasrd = URL.createObjectURL(zasrc);
        var zasre = document.createElement("a");
        zasre.href = zasrd;
        zasre.download = zasra || "faoxom-trace.json";
        zasre.click();
        setTimeout(function() {
            URL.revokeObjectURL(zasrd);
        }, 1e3);
        return zasrb;
    }
    frameSnapshot() {
        return this.frame;
    }
    dispose() {
        this._disposed = true;
        this.enabled = false;
        var zasra = function(zasra) {
            try {
                if (zasra && typeof zasra.destroy === "function") zasra.destroy();
            } catch (zasra) {}
        };
        if (this._querySet && typeof this._querySet.destroy === "function") {
            try {
                this._querySet.destroy();
            } catch (zasra) {}
        }
        zasra(this._resolveBuffer);
        if (this._staging) {
            zasra(this._staging[0]);
            zasra(this._staging[1]);
        }
        this._querySet = null;
        this._resolveBuffer = null;
        this._staging = null;
        if (this._overlayCanvas && this._overlayCanvas.parentNode) {
            try {
                this._overlayCanvas.parentNode.removeChild(this._overlayCanvas);
            } catch (zasra) {}
        }
        this._overlayCanvas = null;
        this._overlayContext = null;
        this.renderer = null;
        this.history = [];
        this.frame = null;
        return this;
    }
}

export { FrameProfiler };
