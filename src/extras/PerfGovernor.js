var zaiia = [ "low", "medium", "high", "ultra" ];

class PerfGovernor {
    constructor(zaiib) {
        zaiib = zaiib || {};
        this.app = zaiib.app || null;
        this.renderer = zaiib.renderer || zaiib.app && zaiib.app.renderer || null;
        this.tiers = zaiib.tiers && zaiib.tiers.length ? zaiib.tiers : zaiia;
        this.ladders = {};
        if (zaiib.ladders) {
            for (var zaiic in zaiib.ladders) {
                var zaiid = zaiib.ladders[zaiic];
                this.ladders[zaiic] = Array.isArray(zaiid) ? zaiid.slice() : [ zaiid ];
            }
        }
        this.minScale = zaiib.minScale !== undefined ? zaiib.minScale : .5;
        this.maxScale = zaiib.maxScale !== undefined ? zaiib.maxScale : 1;
        this.scaleStep = zaiib.scaleStep !== undefined ? zaiib.scaleStep : .125;
        this.degradeBelowFps = zaiib.degradeBelowFps !== undefined ? zaiib.degradeBelowFps : 48;
        this.upgradeAboveFps = zaiib.upgradeAboveFps !== undefined ? zaiib.upgradeAboveFps : 57;
        this.hysteresisFrames = zaiib.hysteresisFrames !== undefined ? zaiib.hysteresisFrames : 45;
        this.upgradeHysteresisFrames = zaiib.upgradeHysteresisFrames !== undefined ? zaiib.upgradeHysteresisFrames : 120;
        this.scaleHysteresisFrames = zaiib.scaleHysteresisFrames !== undefined ? zaiib.scaleHysteresisFrames : 20;
        this.cooldownMs = zaiib.cooldownMs !== undefined ? zaiib.cooldownMs : 3e3;
        this.scaleCooldownMs = zaiib.scaleCooldownMs !== undefined ? zaiib.scaleCooldownMs : 1500;
        this.emaAlpha = zaiib.emaAlpha !== undefined ? zaiib.emaAlpha : .1;
        this.resolutionScaling = zaiib.resolutionScaling !== false;
        this.onTierChange = typeof zaiib.onTierChange === "function" ? zaiib.onTierChange : null;
        this.onResolutionChange = typeof zaiib.onResolutionChange === "function" ? zaiib.onResolutionChange : null;
        this.onDegrade = typeof zaiib.onDegrade === "function" ? zaiib.onDegrade : null;
        this.onUpgrade = typeof zaiib.onUpgrade === "function" ? zaiib.onUpgrade : null;
        this.tier = typeof zaiib.tier === "number" ? this._clampTier(zaiib.tier) : this.tiers.length - 1;
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
        this.stats = {
            samples: 0,
            switches: 0,
            upgrades: 0,
            downgrades: 0,
            resolutionChanges: 0,
            lastSwitchAt: 0,
            lastSwitchFrom: null,
            lastSwitchTo: null
        };
    }
    _clampTier(zaiia) {
        return Math.max(0, Math.min(this.tiers.length - 1, Math.floor(zaiia)));
    }
    _now() {
        return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    }
    attach(zaiia) {
        var zaiib = zaiia || this.app;
        if (!zaiib || typeof zaiib.addFrameCallback !== "function") throw new Error("PerfGovernor.attach requires an app with addFrameCallback");
        this.app = zaiib;
        var zaiic = this;
        this._attachedLive = true;
        this._attached = function(zaiia) {
            if (zaiic._attachedLive && !zaiic.disposed) zaiic.updateSeconds(zaiia);
        };
        zaiib.addFrameCallback(this._attached);
        return this;
    }
    detach() {
        this._attachedLive = false;
        if (this._attached && this.app && typeof this.app.removeFrameCallback === "function") this.app.removeFrameCallback(this._attached);
        this._attached = null;
        return this;
    }
    updateSeconds(zaiia) {
        return this.update((zaiia || 0) * 1e3);
    }
    update(zaiia) {
        if (this.disposed) return this;
        if (typeof zaiia === "number" && zaiia > 0 && zaiia < 1e3) {
            this.msEMA = this.msEMA < 0 ? zaiia : this.msEMA + this.emaAlpha * (zaiia - this.msEMA);
            this.fpsEMA = 1e3 / this.msEMA;
            this._samples++;
            this.stats.samples++;
        }
        var zaiib = this._now();
        this._updateResolutionScale(zaiib);
        this._updateTier(zaiib);
        return this;
    }
    _updateResolutionScale(zaiia) {
        if (!this.resolutionScaling) return;
        if (this.fpsEMA < 0) return;
        if (zaiia - this._lastScaleAt < this.scaleCooldownMs && this._lastScaleAt > 0) return;
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
    _updateTier(zaiia) {
        if (this.manualTier || this.fpsEMA < 0 || !this.tiers.length) return;
        if (zaiia - this._lastTierSwitchAt < this.cooldownMs && this._lastTierSwitchAt > 0) return;
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
    setResolutionScale(zaiia, zaiib) {
        var zaiic = Math.max(this.minScale, Math.min(this.maxScale, zaiia));
        zaiic = Math.round(zaiic * 1e3) / 1e3;
        if (zaiic === this.scale) return this.scale;
        this.scale = zaiic;
        this._lastScaleAt = this._now();
        this.stats.resolutionChanges++;
        this._applyResolution();
        if (typeof this.onResolutionChange === "function") {
            try {
                this.onResolutionChange(this.scale, zaiib || "manual", this);
            } catch (zaiia) {}
        }
        return this.scale;
    }
    _applyResolution() {
        var zaiia = this.renderer;
        if (!zaiia) return;
        var zaiib = this._basePixelRatio * this.scale;
        if (typeof zaiia.setPixelRatio === "function") zaiia.setPixelRatio(zaiib); else {
            zaiia.pixelRatio = zaiib;
            if (typeof zaiia.resize === "function") {
                var zaiic = zaiia.width / (zaiia.pixelRatio / this.scale) || 1;
                zaiia.resize(zaiic, zaiia.height / (zaiia.pixelRatio / this.scale) || 1);
            }
        }
    }
    getResolutionScale() {
        return this.scale;
    }
    getTier() {
        return this.tier;
    }
    getTierName() {
        return this.tiers[this.tier];
    }
    fps() {
        return this.fpsEMA < 0 ? 0 : this.fpsEMA;
    }
    getLadders() {
        var zaiia = {};
        for (var zaiib in this.ladders) {
            var zaiic = this.ladders[zaiib];
            zaiia[zaiib] = zaiic[Math.min(this.tier, zaiic.length - 1)];
        }
        return zaiia;
    }
    setLadder(zaiia, zaiib) {
        this.ladders[zaiia] = Array.isArray(zaiib) ? zaiib.slice() : [ zaiib ];
        return this;
    }
    setTier(zaiia, zaiib) {
        var zaiic = this._clampTier(zaiia);
        if (zaiic === this.tier) return this.tier;
        var zaiid = this.tier;
        this.tier = zaiic;
        this._lastTierSwitchAt = this._now();
        this._belowFrames = 0;
        this._aboveFrames = 0;
        this.stats.switches++;
        this.stats.lastSwitchAt = this._lastTierSwitchAt;
        this.stats.lastSwitchFrom = this.tiers[zaiid];
        this.stats.lastSwitchTo = this.tiers[zaiic];
        if (zaiic < zaiid) {
            this.stats.downgrades++;
            if (typeof this.onDegrade === "function") {
                try {
                    this.onDegrade(this.tiers[zaiic], zaiib || "manual", this);
                } catch (zaiia) {}
            }
        } else {
            this.stats.upgrades++;
            if (typeof this.onUpgrade === "function") {
                try {
                    this.onUpgrade(this.tiers[zaiic], zaiib || "manual", this);
                } catch (zaiia) {}
            }
        }
        if (typeof this.onTierChange === "function") {
            try {
                this.onTierChange(this.tiers[zaiid], this.tiers[zaiic], this.getLadders(), zaiib || "manual", this);
            } catch (zaiia) {}
        }
        return this.tier;
    }
    forceTier(zaiia) {
        this.manualTier = true;
        return this.setTier(zaiia, "manual-force");
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
