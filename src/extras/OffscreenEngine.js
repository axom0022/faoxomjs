class OffscreenEngine {
    constructor(zaiea) {
        zaiea = zaiea || {};
        this.canvas = zaiea.canvas || null;
        this.workerUrl = zaiea.workerUrl || null;
        this.width = Math.max(1, Math.floor(zaiea.width || 256));
        this.height = Math.max(1, Math.floor(zaiea.height || 256));
        this.background = zaiea.background !== undefined ? zaiea.background : 0;
        this.fov = zaiea.fov || 60;
        this.worker = null;
        this.ready = false;
        this.lastHash = null;
        this.lastDraws = 0;
        this.stats = {
            renders: 0,
            loaded: 0
        };
        this.callbacks = {};
        this._waiters = [];
        this._transferred = false;
        this._terminated = false;
    }
    on(zaiea, zaieb) {
        if (typeof zaieb !== "function") return this;
        if (!this.callbacks[zaiea]) this.callbacks[zaiea] = [];
        this.callbacks[zaiea].push(zaieb);
        return this;
    }
    emit(zaiea) {
        var zaieb = this.callbacks[zaiea] || [];
        var zaiec = Array.prototype.slice.call(arguments, 1);
        for (var zaied = 0; zaied < zaieb.length; zaied++) {
            try {
                zaieb[zaied].apply(this, zaiec);
            } catch (zaiea) {}
        }
        return this;
    }
    _waitFor(zaiea) {
        var zaieb = this;
        return new Promise(function(zaiec, zaied) {
            zaieb._waiters.push({
                type: zaiea,
                resolve: zaiec,
                reject: zaied
            });
        });
    }
    _resolveWaiters(zaiea) {
        var zaieb = [];
        var zaiec = null;
        if (zaiea.type === "error" && zaiea.command) {
            var zaied = {
                init: "ready",
                load: "loaded",
                render: "rendered",
                png: "png",
                ping: "pong",
                resize: "resized"
            };
            zaiec = zaied[zaiea.command] || null;
        }
        for (var zaiee = 0; zaiee < this._waiters.length; zaiee++) {
            var zaief = this._waiters[zaiee];
            if (zaief.type === zaiea.type) zaief.resolve(zaiea); else if (zaiec && zaief.type === zaiec) zaief.reject(new Error(zaiea.message || "worker error in " + zaiea.command)); else zaieb.push(zaief);
        }
        this._waiters = zaieb;
    }
    async init() {
        if (this.ready) return this;
        if (!this.canvas || typeof this.canvas.transferControlToOffscreen !== "function") throw new Error("OffscreenEngine requires a canvas with transferControlToOffscreen");
        if (!this.workerUrl) throw new Error('OffscreenEngine requires workerUrl (e.g. "src/extras/faoxom-worker.js" or your bundled worker)');
        if (this._transferred) throw new Error("canvas was already transferred");
        var zaiea = this.canvas.transferControlToOffscreen();
        this._transferred = true;
        this.worker = new Worker(this.workerUrl, {
            type: "module"
        });
        var zaieb = this;
        this.worker.onmessage = function(zaiea) {
            var zaiec = zaiea.data;
            if (!zaiec || !zaiec.type) return;
            if (zaiec.type === "rendered") {
                zaieb.lastHash = zaiec.hash;
                zaieb.lastDraws = zaiec.draws;
                zaieb.stats.renders++;
            }
            if (zaiec.type === "loaded") zaieb.stats.loaded++;
            if (zaiec.type === "error") zaieb.emit("error", zaiec.message, zaiec.command);
            zaieb._resolveWaiters(zaiec);
            zaieb.emit(zaiec.type, zaiec);
        };
        this.worker.onerror = function(zaiea) {
            zaieb.emit("error", zaiea && zaiea.message ? zaiea.message : "worker error", "worker");
        };
        var zaiec = this._waitFor("ready");
        this.worker.postMessage({
            type: "init",
            canvas: zaiea,
            width: this.width,
            height: this.height,
            background: this.background,
            fov: this.fov
        }, [ zaiea ]);
        await zaiec;
        this.ready = true;
        return this;
    }
    async load(zaiea) {
        if (!this.ready) throw new Error("OffscreenEngine not initialized");
        var zaieb = zaiea;
        if (typeof zaiea === "string") {
            var zaiec = await fetch(zaiea);
            if (!zaiec.ok) throw new Error("OffscreenEngine load failed: " + zaiec.status);
            zaieb = new Uint8Array(await zaiec.arrayBuffer());
        }
        if (!(zaieb instanceof Uint8Array)) zaieb = new Uint8Array(zaieb || new ArrayBuffer(0));
        var zaied = this._waitFor("loaded");
        var zaiee = zaieb.buffer.slice(zaieb.byteOffset, zaieb.byteOffset + zaieb.byteLength);
        this.worker.postMessage({
            type: "load",
            bytes: new Uint8Array(zaiee)
        }, [ zaiee ]);
        var zaief = await zaied;
        return zaief;
    }
    setCamera(zaiea) {
        if (!this.ready) throw new Error("OffscreenEngine not initialized");
        zaiea = zaiea || {};
        this.worker.postMessage({
            type: "camera",
            fov: zaiea.fov,
            position: zaiea.position,
            target: zaiea.target
        });
        return this;
    }
    async render() {
        if (!this.ready) throw new Error("OffscreenEngine not initialized");
        var zaiea = this._waitFor("rendered");
        this.worker.postMessage({
            type: "render"
        });
        var zaieb = await zaiea;
        return {
            hash: zaieb.hash,
            draws: zaieb.draws,
            triangles: zaieb.triangles,
            frames: zaieb.frames
        };
    }
    async renderPNG() {
        if (!this.ready) throw new Error("OffscreenEngine not initialized");
        var zaiea = this._waitFor("png");
        this.worker.postMessage({
            type: "png"
        });
        var zaieb = await zaiea;
        return {
            hash: zaieb.hash,
            byteLength: zaieb.byteLength,
            draws: zaieb.draws,
            png: zaieb.png
        };
    }
    resize(zaiea, zaieb) {
        if (!this.ready) return this;
        this.width = Math.max(1, Math.floor(zaiea || this.width));
        this.height = Math.max(1, Math.floor(zaieb || this.height));
        this.worker.postMessage({
            type: "resize",
            width: this.width,
            height: this.height
        });
        return this;
    }
    async ping() {
        if (!this.ready) return false;
        var zaiea = this._waitFor("pong");
        this.worker.postMessage({
            type: "ping"
        });
        var zaieb = await zaiea;
        return zaieb.frames;
    }
    start() {
        if (this._loopActive) return this;
        this._loopActive = true;
        var zaiea = this;
        var zaieb = function() {
            if (!zaiea._loopActive || zaiea._terminated) return;
            zaiea.worker.postMessage({
                type: "render"
            });
            zaiea._frameHandle = requestAnimationFrame(zaieb);
        };
        this._frameHandle = requestAnimationFrame(zaieb);
        return this;
    }
    stop() {
        this._loopActive = false;
        if (this._frameHandle !== undefined && typeof cancelAnimationFrame === "function") cancelAnimationFrame(this._frameHandle);
        this._frameHandle = undefined;
        return this;
    }
    terminate() {
        this.stop();
        this._terminated = true;
        if (this.worker) this.worker.terminate();
        this.worker = null;
        this.ready = false;
        return this;
    }
}

export { OffscreenEngine };
