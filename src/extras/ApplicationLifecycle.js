class ApplicationLifecycle {
    constructor(engine, options) {
        options = options || {};
        this.engine = engine || null;
        this.autoSuspend = options.autoSuspend !== false;
        this.autoResume = options.autoResume !== false;
        this.handleNetwork = options.handleNetwork !== false;
        this.handleDeviceLoss = options.handleDeviceLoss !== false;
        this.state = "created";
        this.reason = "initial";
        this.bound = false;
        this.listeners = new Map;
        this.handlers = Object.create(null);
        this.stats = {
            visibilityChanges: 0,
            freezes: 0,
            resumes: 0,
            networkDisconnects: 0,
            networkReconnects: 0,
            deviceLosses: 0,
            orientationChanges: 0,
            fullscreenChanges: 0,
            pointerLockChanges: 0
        };
    }
    attach() {
        if (this.bound || typeof globalThis === "undefined") return this;
        var self = this;
        var doc = typeof document !== "undefined" ? document : null;
        var win = typeof window !== "undefined" ? window : null;
        this.handlers.visibility = function() {
            self.stats.visibilityChanges++;
            if (doc.hidden) self.transition("hidden", "visibility"); else self.transition("active", "visibility");
        };
        this.handlers.freeze = function() {
            self.stats.freezes++;
            self.transition("frozen", "freeze");
        };
        this.handlers.resume = function() {
            self.stats.resumes++;
            self.transition("active", "resume");
        };
        this.handlers.offline = function() {
            self.stats.networkDisconnects++;
            self.emit("offline", self);
        };
        this.handlers.online = function() {
            self.stats.networkReconnects++;
            self.emit("online", self);
        };
        this.handlers.orientation = function() {
            self.stats.orientationChanges++;
            self.emit("orientationchange", self);
        };
        this.handlers.fullscreen = function() {
            self.stats.fullscreenChanges++;
            self.emit("fullscreenchange", self);
        };
        this.handlers.pointerlock = function() {
            self.stats.pointerLockChanges++;
            self.emit("pointerlockchange", self);
        };
        if (doc) {
            doc.addEventListener("visibilitychange", this.handlers.visibility);
            doc.addEventListener("freeze", this.handlers.freeze);
            doc.addEventListener("resume", this.handlers.resume);
            doc.addEventListener("fullscreenchange", this.handlers.fullscreen);
            doc.addEventListener("pointerlockchange", this.handlers.pointerlock);
        }
        if (win) {
            win.addEventListener("offline", this.handlers.offline);
            win.addEventListener("online", this.handlers.online);
            win.addEventListener("orientationchange", this.handlers.orientation);
            win.addEventListener("pagehide", this.handlers.freeze);
            win.addEventListener("pageshow", this.handlers.resume);
        }
        this.bound = true;
        this.state = doc && doc.hidden ? "hidden" : "active";
        return this;
    }
    detach() {
        if (!this.bound) return this;
        var doc = typeof document !== "undefined" ? document : null;
        var win = typeof window !== "undefined" ? window : null;
        if (doc) {
            doc.removeEventListener("visibilitychange", this.handlers.visibility);
            doc.removeEventListener("freeze", this.handlers.freeze);
            doc.removeEventListener("resume", this.handlers.resume);
            doc.removeEventListener("fullscreenchange", this.handlers.fullscreen);
            doc.removeEventListener("pointerlockchange", this.handlers.pointerlock);
        }
        if (win) {
            win.removeEventListener("offline", this.handlers.offline);
            win.removeEventListener("online", this.handlers.online);
            win.removeEventListener("orientationchange", this.handlers.orientation);
            win.removeEventListener("pagehide", this.handlers.freeze);
            win.removeEventListener("pageshow", this.handlers.resume);
        }
        this.bound = false;
        return this;
    }
    transition(state, reason) {
        if (state === this.state) return this;
        var previous = this.state;
        this.state = state;
        this.reason = reason || "unknown";
        if ((state === "hidden" || state === "frozen") && this.autoSuspend && this.engine && typeof this.engine.suspend === "function") this.engine.suspend(this.reason);
        if (state === "active" && this.autoResume && this.engine && typeof this.engine.resume === "function") this.engine.resume(this.reason);
        this.emit("change", { previous: previous, state: state, reason: this.reason, lifecycle: this });
        return this;
    }
    monitorDevice(device) {
        if (!device || !device.lost || typeof device.lost.then !== "function") return this;
        var self = this;
        device.lost.then(function(info) {
            self.stats.deviceLosses++;
            self.transition("device-lost", info && info.reason || "device-lost");
            self.emit("devicelost", info || {});
        });
        return this;
    }
    on(type, listener) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set);
        this.listeners.get(type).add(listener);
        return this;
    }
    off(type, listener) {
        var listeners = this.listeners.get(type);
        if (listeners) listeners.delete(listener);
        return this;
    }
    emit(type, value) {
        var listeners = this.listeners.get(type);
        if (listeners) listeners.forEach(function(listener) { listener(value); });
        return this;
    }
    report() {
        return { state: this.state, reason: this.reason, attached: this.bound, stats: Object.assign({}, this.stats) };
    }
    dispose() {
        this.detach();
        this.listeners.clear();
        this.state = "disposed";
        return this;
    }
}

export { ApplicationLifecycle };
