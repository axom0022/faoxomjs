// FrameProfiler - profiler overlay with GPU timestamps (roadmap item 39).
// Instruments the renderer's render passes: GPU timestamp deltas through the
// timestamp-query feature (with a CPU-timing fallback), draw/pipeline counts,
// texture+buffer ledger integration, shader-cache stats, an in-canvas HUD
// (2D overlay canvas, strictly code-driven) and Chrome trace event export.

var GPU_BUFFER_USAGE = { MAP_READ: 0x1, COPY_DST: 0x8, COPY_SRC: 0x4, QUERY_RESOLVE: 0x200 };
var PASS_COLORS = ["#4fc3f7", "#ffb74d", "#81c784", "#e57373", "#ba68c8", "#fff176", "#4db6ac", "#f06292"];

class FrameProfiler {
    constructor(renderer, options) {
        options = options || {};
        this.renderer = renderer || null;
        this.enabled = options.enabled !== false;
        this.overlay = options.overlay !== false && typeof document !== "undefined";
        this.overlayTarget = options.overlayTarget || null;
        this.historyLength = options.history || 120;
        this.maxPasses = options.maxPasses || 16;
        this.gpuTimestamps = options.gpuTimestamps !== false;
        this.timestampPeriod = options.timestampPeriod !== undefined ? options.timestampPeriod : null;
        this.ledger = options.ledger || null;
        this.history = [];
        this.stats = { frames: 0, sampled: 0, gpuFrames: 0, cpuFrames: 0, avgGpuMs: 0, avgFps: 0 };
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

    _nowUs() { return Math.round(this._now() * 1000); }

    _period() {
        if (this.timestampPeriod !== null) return this.timestampPeriod;
        var adapter = this.renderer && this.renderer.adapter;
        var info = adapter && adapter.info;
        return info && typeof info.timestampPeriod === "number" ? info.timestampPeriod : 1;
    }

    // (Re)arms GPU timestamp machinery when a new device appears.
    _watchDevice() {
        var device = this.renderer && this.renderer.device;
        if (!device || device === this._watchedDevice) return;
        this._watchedDevice = device;
        this._gpuTimers = false;
        this._querySet = null;
        if (!this.gpuTimestamps) return;
        var features = device.features;
        var supported = false;
        try { supported = !!(features && features.has && features.has("timestamp-query")); } catch (featureError) { supported = false; }
        if (!supported) return;
        var count = this.maxPasses * 2;
        try {
            this._querySet = device.createQuerySet({ type: "timestamp", count: count });
            this._resolveBuffer = device.createBuffer({ size: count * 8, usage: GPU_BUFFER_USAGE.QUERY_RESOLVE | GPU_BUFFER_USAGE.COPY_SRC });
            this._staging = [
                device.createBuffer({ size: count * 8, usage: GPU_BUFFER_USAGE.MAP_READ | GPU_BUFFER_USAGE.COPY_DST }),
                device.createBuffer({ size: count * 8, usage: GPU_BUFFER_USAGE.MAP_READ | GPU_BUFFER_USAGE.COPY_DST })
            ];
            this._gpuTimers = true;
        } catch (createError) {
            this._gpuTimers = false;
            this._querySet = null;
        }
    }

    // Renderer hook: wrap a render-pass descriptor with timestamp writes.
    passDescriptor(name, descriptor) {
        if (!this.enabled || this._disposed) return descriptor;
        if (!this._inFrame) this.beginFrame();
        var entry = { name: name, gpuMs: null, cpuMs: null, cpuStart: this._now() };
        if (this.frame.passes.length) {
            var previous = this.frame.passes[this.frame.passes.length - 1];
            if (previous.cpuStart !== null && previous.cpuMs === null) previous.cpuMs = Math.max(0, entry.cpuStart - previous.cpuStart);
        }
        this.frame.passes.push(entry);
        if (this._gpuTimers && this._slot < this.maxPasses) {
            descriptor = Object.assign({}, descriptor);
            descriptor.timestampWrites = {
                querySet: this._querySet,
                beginningOfPassWriteIndex: this._slot * 2,
                endOfPassWriteIndex: this._slot * 2 + 1
            };
            entry.slot = this._slot;
            this._slot++;
        }
        return descriptor;
    }

    beginFrame() {
        if (!this.enabled || this._disposed) return this;
        this._watchDevice();
        var now = this._now();
        if (this._lastFrameAt > 0) {
            var delta = now - this._lastFrameAt;
            if (delta > 0 && delta < 1000) this._fpsEMA = this._fpsEMA < 0 ? 1000 / delta : this._fpsEMA + 0.1 * (1000 / delta - this._fpsEMA);
        }
        this._lastFrameAt = now;
        this.frame = { frame: this.stats.frames, tsUs: this._nowUs(), passes: [], totalGpuMs: 0, totalCpuMs: 0, draws: 0, triangles: 0, pipelines: 0, ledger: null, fps: this._fpsEMA < 0 ? 0 : this._fpsEMA, source: null };
        this._slot = 0;
        this._inFrame = true;
        return this;
    }

    // Renderer hook (pre-submit): encode the query resolve + staging copy.
    resolve(encoder) {
        if (!this.enabled || this._disposed || !this._gpuTimers || !this.frame || this._slot === 0) return;
        var slotCount = this._slot * 2;
        var byteSize = slotCount * 8;
        this._stagingIndex = 1 - this._stagingIndex;
        var staging = this._staging[this._stagingIndex];
        encoder.resolveQuerySet(this._querySet, 0, slotCount, this._resolveBuffer, 0);
        encoder.copyBufferToBuffer(this._resolveBuffer, 0, staging, 0, byteSize);
        this.frame._staging = staging;
        this.frame._byteSize = byteSize;
        return this;
    }

    // Renderer hook (post-submit): finalize the frame record, read timestamps,
    // update history and HUD.
    endFrame(renderer) {
        if (!this.enabled || this._disposed || !this.frame) return this;
        var current = this.renderer || renderer;
        var last = this.frame.passes[this.frame.passes.length - 1];
        if (last && last.cpuStart !== null && last.cpuMs === null) last.cpuMs = Math.max(0, this._now() - last.cpuStart);
        if (current && current.info) {
            this.frame.draws = current.info.render.calls;
            this.frame.triangles = current.info.render.triangles;
        }
        if (current && current.pipelineCache) this.frame.pipelines = Object.keys(current.pipelineCache).length;
        var ledger = this.ledger || (current && current.ledger);
        if (ledger && typeof ledger.snapshot === "function") {
            try { this.frame.ledger = ledger.snapshot(); } catch (ledgerError) { this.frame.ledger = null; }
        }
        var gpuPromise = this._readTimestamps();
        if (gpuPromise) this.frame.gpuReadback = gpuPromise;
        else {
            this._finishFrame();
        }
        this._inFrame = false;
        return this;
    }

    _readTimestamps() {
        var frame = this.frame;
        if (!this._gpuTimers || !frame || !frame._staging || this._pending) return null;
        var staging = frame._staging;
        var byteSize = frame._byteSize;
        var self = this;
        this._pending = true;
        var promise = staging.mapAsync(0x1).then(function() {
            var data = new BigInt64Array(staging.getMappedRange(), 0, byteSize / 8);
            var period = self._period();
            for (var i = 0; i < frame.passes.length; i++) {
                var pass = frame.passes[i];
                if (pass.slot === undefined || pass.slot === null) continue;
                var begin = Number(data[pass.slot * 2]);
                var end = Number(data[pass.slot * 2 + 1]);
                if (end >= begin) pass.gpuMs = (end - begin) * period / 1000000;
            }
            staging.unmap();
        }).catch(function() { /* timestamps lost - keep cpu fallback */ }).then(function() {
            self._pending = false;
            self._finishFrame();
        });
        this.lastReadback = promise;
        return promise;
    }

    _finishFrame() {
        var frame = this.frame;
        if (!frame) return;
        frame.totalGpuMs = 0;
        frame.totalCpuMs = 0;
        for (var i = 0; i < frame.passes.length; i++) {
            frame.totalGpuMs += frame.passes[i].gpuMs || 0;
            frame.totalCpuMs += frame.passes[i].cpuMs || 0;
        }
        frame.source = this._gpuTimers ? "gpu" : "cpu";
        this.stats.frames++;
        if (frame.source === "gpu") this.stats.gpuFrames++;
        else this.stats.cpuFrames++;
        this.stats.sampled++;
        var totalFrames = this.stats.sampled;
        this.stats.avgGpuMs = this.stats.avgGpuMs + (frame.totalGpuMs - this.stats.avgGpuMs) / totalFrames;
        this.stats.avgFps = frame.fps || this.stats.avgFps;
        this.history.push(frame);
        if (this.history.length > this.historyLength) this.history.splice(0, this.history.length - this.historyLength);
        if (this.overlay) this._drawOverlay();
    }

    _ensureOverlay() {
        if (this._overlayCanvas || !this.overlay || typeof document === "undefined") return this._overlayCanvas;
        try {
            var canvas = document.createElement("canvas");
            canvas.width = 360;
            canvas.height = 190;
            canvas.style.cssText = "position:absolute;left:8px;top:8px;width:360px;height:190px;pointer-events:none;z-index:2147483647;background:rgba(8,12,18,0.72);font:10px monospace;";
            var renderer = this.renderer;
            var host = this.overlayTarget || (renderer && renderer.canvas && renderer.canvas.parentNode) || document.body;
            if (host === document.body) canvas.style.position = "fixed";
            host.appendChild(canvas);
            this._overlayCanvas = canvas;
            this._overlayContext = canvas.getContext && canvas.getContext("2d") ? canvas.getContext("2d") : null;
        } catch (overlayError) {
            this.overlay = false;
        }
        return this._overlayCanvas;
    }

    _drawOverlay() {
        var canvas = this._ensureOverlay();
        var ctx = this._overlayContext;
        if (!canvas || !ctx) return;
        try {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = "10px monospace";
            var last = this.history[this.history.length - 1];
            if (!last) return;
            ctx.fillStyle = "#9be29b";
            ctx.fillText("faoxom profiler - " + last.source + " timestamps", 8, 14);
            ctx.fillStyle = "#dddddd";
            ctx.fillText("fps " + (last.fps ? last.fps.toFixed(1) : "--") + "  gpu " + (last.source === "gpu" ? last.totalGpuMs.toFixed(3) + "ms" : "n/a") + "  cpu " + last.totalCpuMs.toFixed(2) + "ms", 8, 28);
            ctx.fillText("draws " + last.draws + "  tris " + last.triangles + "  pipelines " + last.pipelines, 8, 42);
            var ledgerText = "ledger: off";
            if (last.ledger) {
                var live = last.ledger.live || {};
                var bytes = last.ledger.totalBytes || 0;
                ledgerText = "buffers " + (live.buffer || 0) + "  textures " + (live.texture || 0) + "  " + (bytes / 1048576).toFixed(2) + " MiB";
            }
            ctx.fillText(ledgerText, 8, 56);
            var bars = Math.min(60, this.history.length);
            var chartHeight = 90;
            var chartTop = 90;
            var peak = 0.001;
            for (var h = this.history.length - bars; h < this.history.length; h++) {
                var frame = this.history[h];
                var total = (frame.source === "gpu" ? frame.totalGpuMs : frame.totalCpuMs) || 0;
                if (total > peak) peak = total;
            }
            ctx.fillStyle = "#666666";
            ctx.fillText("pass timeline (peak " + peak.toFixed(2) + "ms)", 8, chartTop - 4);
            for (var b = 0; b < bars; b++) {
                var index = this.history.length - bars + b;
                var frameData = this.history[index];
                var x = 8 + b * 5.7;
                var y = chartTop;
                for (var p = 0; p < frameData.passes.length; p++) {
                    var passData = frameData.passes[p];
                    var ms = (passData.gpuMs !== null ? passData.gpuMs : passData.cpuMs) || 0;
                    var barHeight = (ms / peak) * chartHeight;
                    ctx.fillStyle = PASS_COLORS[p % PASS_COLORS.length];
                    ctx.fillRect(x, y, 4, -barHeight);
                    y -= barHeight;
                }
            }
            for (var legend = 0; legend < Math.min(6, last.passes.length); legend++) {
                ctx.fillStyle = PASS_COLORS[legend % PASS_COLORS.length];
                ctx.fillText(last.passes[legend].name + " " + ((last.passes[legend].gpuMs !== null ? last.passes[legend].gpuMs : last.passes[legend].cpuMs) || 0).toFixed(3) + "ms", 8, 186 - (Math.min(6, last.passes.length) - 1 - legend) * 11);
            }
        } catch (drawError) { /* overlay is best-effort */ }
    }

    // Chrome trace (Catapult JSON) export of the sampled frames.
    exportTrace() {
        var events = [];
        for (var i = 0; i < this.history.length; i++) {
            var frame = this.history[i];
            var ts = frame.tsUs;
            var cursor = ts;
            for (var p = 0; p < frame.passes.length; p++) {
                var pass = frame.passes[p];
                var dur = Math.round(((pass.gpuMs !== null ? pass.gpuMs : pass.cpuMs) || 0) * 1000);
                events.push({ name: "pass/" + pass.name, cat: "faoxom", ph: "X", ts: cursor, dur: dur, pid: 1, tid: 2, args: { frame: frame.frame, timing: pass.gpuMs !== null ? "gpu" : "cpu" } });
                cursor += dur;
            }
            events.push({ name: "frame", cat: "faoxom.counters", ph: "C", ts: ts, pid: 1, tid: 1, args: { fps: Math.round((frame.fps || 0) * 10) / 10, draws: frame.draws, triangles: frame.triangles, gpuMs: Math.round(frame.totalGpuMs * 1000) / 1000 } });
        }
        return { traceEvents: events, otherData: { generator: "FaoxomJs FrameProfiler", frames: this.stats.frames, source: this._gpuTimers ? "gpu" : "cpu" } };
    }

    downloadTrace(filename) {
        if (typeof document === "undefined" || !document.createElement) return null;
        var trace = this.exportTrace();
        var blob = new Blob([JSON.stringify(trace)], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename || "faoxom-trace.json";
        anchor.click();
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
        return trace;
    }

    frameSnapshot() { return this.frame; }

    dispose() {
        this._disposed = true;
        this.enabled = false;
        var safeDestroy = function(resource) { try { if (resource && typeof resource.destroy === "function") resource.destroy(); } catch (error) { /* gone */ } };
        if (this._querySet && typeof this._querySet.destroy === "function") { try { this._querySet.destroy(); } catch (error) { /* gone */ } }
        safeDestroy(this._resolveBuffer);
        if (this._staging) { safeDestroy(this._staging[0]); safeDestroy(this._staging[1]); }
        this._querySet = null;
        this._resolveBuffer = null;
        this._staging = null;
        if (this._overlayCanvas && this._overlayCanvas.parentNode) {
            try { this._overlayCanvas.parentNode.removeChild(this._overlayCanvas); } catch (removeError) { /* gone */ }
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
