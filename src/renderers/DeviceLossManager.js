// DeviceLossManager - WebGPU device-loss recovery (roadmap item 36).
// Watches GPUDevice.lost, invalidates every cached GPU object on the renderer
// (all resources are reconstructable from CPU-resident copies held by the
// scene graph and the resource-manager source objects), reacquires a device,
// reconfigures the canvas context and re-arms itself on the new device.

class DeviceLossManager {
    constructor(renderer, options) {
        options = options || {};
        this.renderer = renderer || null;
        this.autoRecover = options.autoRecover !== false;
        this.maxAttempts = options.maxAttempts || 5;
        this.backoffMs = options.backoffMs !== undefined ? options.backoffMs : 250;
        this.onLost = typeof options.onLost === "function" ? options.onLost : null;
        this.onRecovered = typeof options.onRecovered === "function" ? options.onRecovered : null;
        this.ledger = options.ledger || null;
        this.isLost = false;
        this.reason = null;
        this.recovering = false;
        this.watched = false;
        this.lastError = null;
        this.stats = { losses: 0, recoveries: 0, attempts: 0, lastRecoveryMs: 0 };
        this._lostPromise = null;
    }

    // Installs the device-lost listener on the renderer's current device.
    // Call again after any device swap (recover() does this automatically).
    watch() {
        var device = this.renderer && this.renderer.device;
        if (!device || !device.lost || typeof device.lost.then !== "function") return this;
        var self = this;
        this._lostPromise = device.lost.then(function(info) { self._handleLost(info); });
        this.watched = true;
        return this;
    }

    _handleLost(info) {
        if (!this.renderer) return this;
        this.isLost = true;
        this.reason = (info && (info.reason || info.message)) || "unknown";
        this.stats.losses++;
        this.renderer.initialized = false;
        this.renderer.device = null;
        if (typeof this.onLost === "function") {
            try { this.onLost(this.reason, this); } catch (callbackError) { this.lastError = callbackError; }
        }
        if (this.autoRecover && !this.recovering) {
            var self = this;
            Promise.resolve().then(function() { return self.recover(); }).catch(function(recoverError) { self.lastError = recoverError; self.isLost = true; });
        }
        return this;
    }

    // Test hook: runs the exact loss path without a real GPU reset.
    simulateLoss(reason) {
        return this._handleLost({ reason: reason || "destroyed", message: "simulated device loss" });
    }

    async recover() {
        if (this.recovering) return false;
        if (!this.renderer) throw new Error("DeviceLossManager: no renderer");
        this.recovering = true;
        var self = this;
        try {
            var attempt = 0;
            var recovered = false;
            while (attempt < this.maxAttempts) {
                attempt++;
                this.stats.attempts++;
                try {
                    if (typeof this.renderer.invalidateGpuState === "function") this.renderer.invalidateGpuState();
                    else this.renderer.initialized = false;
                    if (typeof this.renderer.init !== "function") throw new Error("renderer has no init()");
                    await this.renderer.init();
                    var device = this.renderer.device;
                    if (!device) throw new Error("no device after init");
                    if (this.ledger && typeof this.ledger.attach === "function") {
                        this.renderer.device = this.ledger.attach(device);
                        if (this.renderer.resourceManager && this.renderer.resourceManager.device) this.renderer.resourceManager.device = this.renderer.device;
                    }
                    this.watch();
                    recovered = true;
                    break;
                } catch (attemptError) {
                    this.lastError = attemptError;
                    if (attempt >= this.maxAttempts) throw attemptError;
                    await new Promise(function(resolve) { setTimeout(resolve, self.backoffMs * attempt); });
                }
            }
            if (!recovered) throw new Error("recovery exhausted attempts");
            this.isLost = false;
            this.stats.recoveries++;
            this.stats.lastRecoveryMs = typeof Date !== "undefined" ? Date.now() : 0;
            if (typeof this.onRecovered === "function") {
                try { this.onRecovered(this.reason, this); } catch (callbackError) { this.lastError = callbackError; }
            }
            return true;
        } finally {
            this.recovering = false;
        }
    }

    dispose() {
        this._lostPromise = null;
        this.watched = false;
        this.renderer = null;
        this.onLost = null;
        this.onRecovered = null;
        this.ledger = null;
        return this;
    }
}

export { DeviceLossManager };
