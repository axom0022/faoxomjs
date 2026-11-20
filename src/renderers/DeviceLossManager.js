class DeviceLossManager {
    constructor(zasla, zaslb) {
        zaslb = zaslb || {};
        this.renderer = zasla || null;
        this.autoRecover = zaslb.autoRecover !== false;
        this.maxAttempts = zaslb.maxAttempts || 5;
        this.backoffMs = zaslb.backoffMs !== undefined ? zaslb.backoffMs : 250;
        this.onLost = typeof zaslb.onLost === "function" ? zaslb.onLost : null;
        this.onRecovered = typeof zaslb.onRecovered === "function" ? zaslb.onRecovered : null;
        this.ledger = zaslb.ledger || null;
        this.isLost = false;
        this.reason = null;
        this.recovering = false;
        this.watched = false;
        this.lastError = null;
        this.stats = {
            losses: 0,
            recoveries: 0,
            attempts: 0,
            lastRecoveryMs: 0
        };
        this._lostPromise = null;
    }
    watch() {
        var zasla = this.renderer && this.renderer.device;
        if (!zasla || !zasla.lost || typeof zasla.lost.then !== "function") return this;
        var zaslb = this;
        this._lostPromise = zasla.lost.then(function(zasla) {
            zaslb._handleLost(zasla);
        });
        this.watched = true;
        return this;
    }
    _handleLost(zasla) {
        if (!this.renderer) return this;
        this.isLost = true;
        this.reason = zasla && (zasla.reason || zasla.message) || "unknown";
        this.stats.losses++;
        this.renderer.initialized = false;
        this.renderer.device = null;
        if (typeof this.onLost === "function") {
            try {
                this.onLost(this.reason, this);
            } catch (zasla) {
                this.lastError = zasla;
            }
        }
        if (this.autoRecover && !this.recovering) {
            var zaslb = this;
            Promise.resolve().then(function() {
                return zaslb.recover();
            }).catch(function(zasla) {
                zaslb.lastError = zasla;
                zaslb.isLost = true;
            });
        }
        return this;
    }
    simulateLoss(zasla) {
        return this._handleLost({
            reason: zasla || "destroyed",
            message: "simulated device loss"
        });
    }
    async recover() {
        if (this.recovering) return false;
        if (!this.renderer) throw new Error("DeviceLossManager: no renderer");
        this.recovering = true;
        var zasla = this;
        try {
            var zaslb = 0;
            var zaslc = false;
            while (zaslb < this.maxAttempts) {
                zaslb++;
                this.stats.attempts++;
                try {
                    if (typeof this.renderer.invalidateGpuState === "function") this.renderer.invalidateGpuState(); else this.renderer.initialized = false;
                    if (typeof this.renderer.init !== "function") throw new Error("renderer has no init()");
                    await this.renderer.init();
                    var zasld = this.renderer.device;
                    if (!zasld) throw new Error("no device after init");
                    if (this.ledger && typeof this.ledger.attach === "function") {
                        this.renderer.device = this.ledger.attach(zasld);
                        if (this.renderer.resourceManager && this.renderer.resourceManager.device) this.renderer.resourceManager.device = this.renderer.device;
                    }
                    this.watch();
                    zaslc = true;
                    break;
                } catch (zaslc) {
                    this.lastError = zaslc;
                    if (zaslb >= this.maxAttempts) throw zaslc;
                    await new Promise(function(zaslc) {
                        setTimeout(zaslc, zasla.backoffMs * zaslb);
                    });
                }
            }
            if (!zaslc) throw new Error("recovery exhausted attempts");
            this.isLost = false;
            this.stats.recoveries++;
            this.stats.lastRecoveryMs = typeof Date !== "undefined" ? Date.now() : 0;
            if (typeof this.onRecovered === "function") {
                try {
                    this.onRecovered(this.reason, this);
                } catch (zasla) {
                    this.lastError = zasla;
                }
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
