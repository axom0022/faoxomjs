// PerfGovernor - adaptive performance governor as an engine service
// (roadmap item 37). Real-time fps/frame-time EMA, tier budgets with density
// ladders, dynamic resolution scaling, hysteresis on every transition and a
// cooldown so quality never flip-flops. One line to enable:
//   var governor = new FaoxomJs.PerfGovernor({ app: app, renderer: renderer }).attach();
// or feed samples manually: governor.update(frameTimeMs).

var DEFAULT_TIERS = ["low", "medium", "high", "ultra"];

class PerfGovernor {
    constructor(options) {
        options = options || {};
        this.app = options.app || null;
        this.renderer = options.renderer || (options.app && options.app.renderer) || null;
        this.tiers = options.tiers && options.tiers.length ? options.tiers : DEFAULT_TIERS;
        this.ladders = {};
        if (options.ladders) {
            for (var name in options.ladders) {
                var values = options.ladders[name];
                this.ladders[name] = Array.isArray(values) ? values.slice() : [values];
            }
        }
        this.minScale = options.minScale !== undefined ? options.minScale : 0.5;
        this.maxScale = options.maxScale !== undefined ? options.maxScale : 1;
        this.scaleStep = options.scaleStep !== undefined ? options.scaleStep : 0.125;
        this.degradeBelowFps = options.degradeBelowFps !== undefined ? options.degradeBelowFps : 48;
        this.upgradeAboveFps = options.upgradeAboveFps !== undefined ? options.upgradeAboveFps : 57;
        this.hysteresisFrames = options.hysteresisFrames !== undefined ? options.hysteresisFrames : 45;
        this.upgradeHysteresisFrames = options.upgradeHysteresisFrames !== undefined ? options.upgradeHysteresisFrames : 120;
        this.scaleHysteresisFrames = options.scaleHysteresisFrames !== undefined ? options.scaleHysteresisFrames : 20;
        this.cooldownMs = options.cooldownMs !== undefined ? options.cooldownMs : 3000;
        this.scaleCooldownMs = options.scaleCooldownMs !== undefined ? options.scaleCooldownMs : 1500;
        this.emaAlpha = options.emaAlpha !== undefined ? options.emaAlpha : 0.1;
        this.resolutionScaling = options.resolutionScaling !== false;
        this.onTierChange = typeof options.onTierChange === "function" ? options.onTierChange : null;
        this.onResolutionChange = typeof options.onResolutionChange === "function" ? options.onResolutionChange : null;
        this.onDegrade = typeof options.onDegrade === "function" ? options.onDegrade : null;
        this.onUpgrade = typeof options.onUpgrade === "function" ? options.onUpgrade : null;
        this.tier = typeof options.tier === "number" ? this._clampTier(options.tier) : this.tiers.length - 1;
        this.scale = this.maxScale;
        this.manualTier = false;
        this.disposed = false;
        this.msEMA = -1;
        this.fpsEMA = -1;
        this._samples = 0;
        this._belowFrames = 0;
        this._aboveFrames = 0;
        this._scaleBelowFrames = 0;
        this._scaleAboveFrames = 0;
        this._lastTierSwitchAt = 0;
        this._lastScaleAt = 0;
        this._attached = null;
        this._basePixelRatio = this.renderer && this.renderer.pixelRatio !== undefined ? this.renderer.pixelRatio : 1;
        this.stats = { samples: 0, switches: 0, upgrades: 0, downgrades: 0, resolutionChanges: 0, lastSwitchAt: 0, lastSwitchFrom: null, lastSwitchTo: null };
    }

    _clampTier(index) {
        return Math.max(0, Math.min(this.tiers.length - 1, Math.floor(index)));
    }

    _now() {
        return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    }

    // Hooks the app frame loop: app.addFrameCallback(dtSeconds => ...).
    attach(app) {
        var target = app || this.app;
        if (!target || typeof target.addFrameCallback !== "function") throw new Error("PerfGovernor.attach requires an app with addFrameCallback");
        this.app = target;
        var self = this;
        this._attachedLive = true;
        this._attached = function(dtSeconds) { if (self._attachedLive && !self.disposed) self.updateSeconds(dtSeconds); };
        target.addFrameCallback(this._attached);
        return this;
    }

    detach() {
        this._attachedLive = false;
        if (this._attached && this.app && typeof this.app.removeFrameCallback === "function") this.app.removeFrameCallback(this._attached);
        this._attached = null;
        return this;
    }

    updateSeconds(dtSeconds) {
        return this.update((dtSeconds || 0) * 1000);
    }

    update(frameTimeMs) {
        if (this.disposed) return this;
        if (typeof frameTimeMs === "number" && frameTimeMs > 0 && frameTimeMs < 1000) {
            this.msEMA = this.msEMA < 0 ? frameTimeMs : this.msEMA + this.emaAlpha * (frameTimeMs - this.msEMA);
            this.fpsEMA = 1000 / this.msEMA;
            this._samples++;
            this.stats.samples++;
        }
        var now = this._now();
        this._updateResolutionScale(now);
        this._updateTier(now);
        return this;
    }

    _updateResolutionScale(now) {
        if (!this.resolutionScaling) return;
        if (this.fpsEMA < 0) return;
        if (now - this._lastScaleAt < this.scaleCooldownMs && this._lastScaleAt > 0) return;
        if (this.fpsEMA < this.degradeBelowFps && this.scale > this.minScale + 1e-9) {
            this._scaleBelowFrames++;
            this._scaleAboveFrames = 0;
            if (this._scaleBelowFrames >= this.scaleHysteresisFrames) {
                this._scaleBelowFrames = 0;
                this.setResolutionScale(this.scale - this.scaleStep, "auto-degrade");
            }
        } else if (this.fpsEMA > this.upgradeAboveFps && this.scale < this.maxScale - 1e-9) {
            this._scaleAboveFrames++;
            this._scaleBelowFrames = 0;
            if (this._scaleAboveFrames >= this.scaleHysteresisFrames) {
                this._scaleAboveFrames = 0;
                this.setResolutionScale(this.scale + this.scaleStep, "auto-upgrade");
            }
        } else {
            this._scaleBelowFrames = 0;
            this._scaleAboveFrames = 0;
        }
    }

    _updateTier(now) {
        if (this.manualTier || this.fpsEMA < 0 || !this.tiers.length) return;
        if (now - this._lastTierSwitchAt < this.cooldownMs && this._lastTierSwitchAt > 0) return;
        if (this.fpsEMA < this.degradeBelowFps && this.tier > 0) {
            this._belowFrames++;
            this._aboveFrames = 0;
            if (this._belowFrames >= this.hysteresisFrames) {
                this._belowFrames = 0;
                this.setTier(this.tier - 1, "auto-degrade");
            }
        } else if (this.fpsEMA > this.upgradeAboveFps && this.tier < this.tiers.length - 1) {
            this._aboveFrames++;
            this._belowFrames = 0;
            if (this._aboveFrames >= this.upgradeHysteresisFrames) {
                this._aboveFrames = 0;
                this.setTier(this.tier + 1, "auto-upgrade");
            }
        } else {
            this._belowFrames = 0;
            this._aboveFrames = 0;
        }
    }

    setResolutionScale(scale, reason) {
        var next = Math.max(this.minScale, Math.min(this.maxScale, scale));
        next = Math.round(next * 1000) / 1000;
        if (next === this.scale) return this.scale;
        this.scale = next;
        this._lastScaleAt = this._now();
        this.stats.resolutionChanges++;
        this._applyResolution();
        if (typeof this.onResolutionChange === "function") {
            try { this.onResolutionChange(this.scale, reason || "manual", this); } catch (error) { /* user callback */ }
        }
        return this.scale;
    }

    _applyResolution() {
        var renderer = this.renderer;
        if (!renderer) return;
        var desired = this._basePixelRatio * this.scale;
        if (typeof renderer.setPixelRatio === "function") renderer.setPixelRatio(desired);
        else {
            renderer.pixelRatio = desired;
            if (typeof renderer.resize === "function") {
                var cssWidth = renderer.width / (renderer.pixelRatio / this.scale) || 1;
                renderer.resize(cssWidth, renderer.height / (renderer.pixelRatio / this.scale) || 1);
            }
        }
    }

    getResolutionScale() { return this.scale; }
    getTier() { return this.tier; }
    getTierName() { return this.tiers[this.tier]; }
    fps() { return this.fpsEMA < 0 ? 0 : this.fpsEMA; }

    // Current ladder values for the active tier.
    getLadders() {
        var values = {};
        for (var name in this.ladders) {
            var ladder = this.ladders[name];
            values[name] = ladder[Math.min(this.tier, ladder.length - 1)];
        }
        return values;
    }

    setLadder(name, values) {
        this.ladders[name] = Array.isArray(values) ? values.slice() : [values];
        return this;
    }

    setTier(index, reason) {
        var next = this._clampTier(index);
        if (next === this.tier) return this.tier;
        var previous = this.tier;
        this.tier = next;
        this._lastTierSwitchAt = this._now();
        this._belowFrames = 0;
        this._aboveFrames = 0;
        this.stats.switches++;
        this.stats.lastSwitchAt = this._lastTierSwitchAt;
        this.stats.lastSwitchFrom = this.tiers[previous];
        this.stats.lastSwitchTo = this.tiers[next];
        if (next < previous) {
            this.stats.downgrades++;
            if (typeof this.onDegrade === "function") { try { this.onDegrade(this.tiers[next], reason || "manual", this); } catch (error) { /* user callback */ } }
        } else {
            this.stats.upgrades++;
            if (typeof this.onUpgrade === "function") { try { this.onUpgrade(this.tiers[next], reason || "manual", this); } catch (error) { /* user callback */ } }
        }
        if (typeof this.onTierChange === "function") {
            try { this.onTierChange(this.tiers[previous], this.tiers[next], this.getLadders(), reason || "manual", this); } catch (error) { /* user callback */ }
        }
        return this.tier;
    }

    // Pins the tier: automatic tier changes stop (resolution scaling continues).
    forceTier(index) {
        this.manualTier = true;
        return this.setTier(index, "manual-force");
    }

    releaseAuto() {
        this.manualTier = false;
        return this;
    }

    reset() {
        this.msEMA = -1;
        this.fpsEMA = -1;
        this._samples = 0;
        this._belowFrames = 0;
        this._aboveFrames = 0;
        this._scaleBelowFrames = 0;
        this._scaleAboveFrames = 0;
        this._lastTierSwitchAt = 0;
        this._lastScaleAt = 0;
        return this;
    }

    dispose() {
        this.detach();
        this.disposed = true;
        this.renderer = null;
        this.app = null;
        this.onTierChange = this.onResolutionChange = this.onDegrade = this.onUpgrade = null;
        return this;
    }
}

export { PerfGovernor };
