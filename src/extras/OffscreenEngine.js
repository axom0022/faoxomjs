// OffscreenEngine - main-thread controller for worker-first offscreen
// rendering (roadmap item 43). Transfers a canvas to an engine worker
// (src/extras/faoxom-worker.js), loads .faox scenes, drives the camera and
// collects deterministic render hashes / PNG bytes / draw stats. The main
// thread stays free of all GPU work.

class OffscreenEngine {
    constructor(options) {
        options = options || {};
        this.canvas = options.canvas || null;
        this.workerUrl = options.workerUrl || null;
        this.width = Math.max(1, Math.floor(options.width || 256));
        this.height = Math.max(1, Math.floor(options.height || 256));
        this.background = options.background !== undefined ? options.background : 0x000000;
        this.fov = options.fov || 60;
        this.worker = null;
        this.ready = false;
        this.lastHash = null;
        this.lastDraws = 0;
        this.stats = { renders: 0, loaded: 0 };
        this.callbacks = {};
        this._waiters = [];
        this._transferred = false;
        this._terminated = false;
    }

    on(event, callback) {
        if (typeof callback !== "function") return this;
        if (!this.callbacks[event]) this.callbacks[event] = [];
        this.callbacks[event].push(callback);
        return this;
    }

    emit(event) {
        var list = this.callbacks[event] || [];
        var args = Array.prototype.slice.call(arguments, 1);
        for (var i = 0; i < list.length; i++) {
            try { list[i].apply(this, args); } catch (callbackError) { /* user callback */ }
        }
        return this;
    }

    // Waits for the next worker message of a given type (used to turn the
    // event protocol into awaitable calls).
    _waitFor(type) {
        var self = this;
        return new Promise(function (resolve, reject) {
            self._waiters.push({ type: type, resolve: resolve, reject: reject });
        });
    }

    _resolveWaiters(message) {
        var remaining = [];
        var rejectFor = null;
        if (message.type === "error" && message.command) {
            var commandResponses = { init: "ready", load: "loaded", render: "rendered", png: "png", ping: "pong", resize: "resized" };
            rejectFor = commandResponses[message.command] || null;
        }
        for (var i = 0; i < this._waiters.length; i++) {
            var waiter = this._waiters[i];
            if (waiter.type === message.type) waiter.resolve(message);
            else if (rejectFor && waiter.type === rejectFor) waiter.reject(new Error(message.message || ("worker error in " + message.command)));
            else remaining.push(waiter);
        }
        this._waiters = remaining;
    }

    async init() {
        if (this.ready) return this;
        if (!this.canvas || typeof this.canvas.transferControlToOffscreen !== "function") throw new Error("OffscreenEngine requires a canvas with transferControlToOffscreen");
        if (!this.workerUrl) throw new Error("OffscreenEngine requires workerUrl (e.g. \"src/extras/faoxom-worker.js\" or your bundled worker)");
        if (this._transferred) throw new Error("canvas was already transferred");
        var offscreen = this.canvas.transferControlToOffscreen();
        this._transferred = true;
        this.worker = new Worker(this.workerUrl, { type: "module" });
        var self = this;
        this.worker.onmessage = function (event) {
            var message = event.data;
            if (!message || !message.type) return;
            if (message.type === "rendered") { self.lastHash = message.hash; self.lastDraws = message.draws; self.stats.renders++; }
            if (message.type === "loaded") self.stats.loaded++;
            if (message.type === "error") self.emit("error", message.message, message.command);
            self._resolveWaiters(message);
            self.emit(message.type, message);
        };
        this.worker.onerror = function (errorEvent) {
            self.emit("error", errorEvent && errorEvent.message ? errorEvent.message : "worker error", "worker");
        };
        var readyPromise = this._waitFor("ready");
        this.worker.postMessage({ type: "init", canvas: offscreen, width: this.width, height: this.height, background: this.background, fov: this.fov }, [offscreen]);
        await readyPromise;
        this.ready = true;
        return this;
    }

    async load(bytesOrUrl) {
        if (!this.ready) throw new Error("OffscreenEngine not initialized");
        var bytes = bytesOrUrl;
        if (typeof bytesOrUrl === "string") {
            var response = await fetch(bytesOrUrl);
            if (!response.ok) throw new Error("OffscreenEngine load failed: " + response.status);
            bytes = new Uint8Array(await response.arrayBuffer());
        }
        if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes || new ArrayBuffer(0));
        var loadedPromise = this._waitFor("loaded");
        var buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        this.worker.postMessage({ type: "load", bytes: new Uint8Array(buffer) }, [buffer]);
        var message = await loadedPromise;
        return message;
    }

    setCamera(settings) {
        if (!this.ready) throw new Error("OffscreenEngine not initialized");
        settings = settings || {};
        this.worker.postMessage({ type: "camera", fov: settings.fov, position: settings.position, target: settings.target });
        return this;
    }

    async render() {
        if (!this.ready) throw new Error("OffscreenEngine not initialized");
        var promise = this._waitFor("rendered");
        this.worker.postMessage({ type: "render" });
        var message = await promise;
        return { hash: message.hash, draws: message.draws, triangles: message.triangles, frames: message.frames };
    }

    async renderPNG() {
        if (!this.ready) throw new Error("OffscreenEngine not initialized");
        var promise = this._waitFor("png");
        this.worker.postMessage({ type: "png" });
        var message = await promise;
        return { hash: message.hash, byteLength: message.byteLength, draws: message.draws, png: message.png };
    }

    resize(width, height) {
        if (!this.ready) return this;
        this.width = Math.max(1, Math.floor(width || this.width));
        this.height = Math.max(1, Math.floor(height || this.height));
        this.worker.postMessage({ type: "resize", width: this.width, height: this.height });
        return this;
    }

    async ping() {
        if (!this.ready) return false;
        var promise = this._waitFor("pong");
        this.worker.postMessage({ type: "ping" });
        var message = await promise;
        return message.frames;
    }

    // Main-thread render loop (the GPU work itself stays in the worker).
    start() {
        if (this._loopActive) return this;
        this._loopActive = true;
        var self = this;
        var loop = function () {
            if (!self._loopActive || self._terminated) return;
            self.worker.postMessage({ type: "render" });
            self._frameHandle = requestAnimationFrame(loop);
        };
        this._frameHandle = requestAnimationFrame(loop);
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
