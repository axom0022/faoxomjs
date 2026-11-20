class ResidencyManager {
    constructor(zaisa) {
        zaisa = zaisa || {};
        var zaisb = zaisa.rings === undefined ? [ 64, 128, 256 ] : zaisa.rings;
        if (!Array.isArray(zaisb) || zaisb.length === 0) throw new Error("ResidencyManager requires a non-empty rings array of radii");
        for (var zaisc = 0; zaisc < zaisb.length; zaisc++) {
            var zaisd = zaisb[zaisc];
            if (typeof zaisd !== "number" || !isFinite(zaisd) || zaisd <= 0) throw new Error("ResidencyManager ring radii must be positive finite numbers");
            if (zaisc > 0 && zaisd <= zaisb[zaisc - 1]) throw new Error("ResidencyManager ring radii must be strictly increasing");
        }
        this.rings = zaisb.slice();
        var zaise = zaisa.hysteresis === undefined ? this.rings[0] : zaisa.hysteresis;
        if (typeof zaise !== "number" || !isFinite(zaise) || zaise < 0) throw new Error("ResidencyManager hysteresis must be a non-negative finite number");
        this.hysteresis = zaise;
        this.unloadRadius = this.rings[this.rings.length - 1] + this.hysteresis;
        var zaisf = zaisa.maxInflight === undefined ? 4 : zaisa.maxInflight;
        if (typeof zaisf !== "number" || !isFinite(zaisf) || Math.floor(zaisf) !== zaisf || zaisf < 1) throw new Error("ResidencyManager maxInflight must be an integer of at least 1");
        this.maxInflight = zaisf;
        var zaisg = zaisa.maxRetries === undefined ? 2 : zaisa.maxRetries;
        if (typeof zaisg !== "number" || !isFinite(zaisg) || Math.floor(zaisg) !== zaisg || zaisg < 0) throw new Error("ResidencyManager maxRetries must be a non-negative integer");
        this.maxRetries = zaisg;
        var zaish = zaisa.minResidentMs === undefined ? 0 : zaisa.minResidentMs;
        if (typeof zaish !== "number" || !isFinite(zaish) || zaish < 0) throw new Error("ResidencyManager minResidentMs must be a non-negative finite number");
        this.minResidentMs = zaish;
        var zaisi = zaisa.velocityWeight === undefined ? 20 : zaisa.velocityWeight;
        if (typeof zaisi !== "number" || !isFinite(zaisi) || zaisi < 0) throw new Error("ResidencyManager velocityWeight must be a non-negative finite number");
        this.velocityWeight = zaisi;
        var zaisj = zaisa.maxBytesPerUpdate === undefined ? Infinity : zaisa.maxBytesPerUpdate;
        if (typeof zaisj !== "number" || zaisj !== Infinity && (!isFinite(zaisj) || zaisj < 0)) throw new Error("ResidencyManager maxBytesPerUpdate must be a non-negative finite number or Infinity");
        this.maxBytesPerUpdate = zaisj;
        this.resourceManager = zaisa.resourceManager || null;
        this.clock = typeof zaisa.clock === "function" ? zaisa.clock : typeof performance !== "undefined" && performance && typeof performance.now === "function" ? function() {
            return performance.now();
        } : function() {
            return Date.now();
        };
        this.onLoad = typeof zaisa.onLoad === "function" ? zaisa.onLoad : null;
        this.onEvict = typeof zaisa.onEvict === "function" ? zaisa.onEvict : null;
        this.tiles = typeof Map !== "undefined" ? new Map : {};
        this.queue = [];
        this.inflight = 0;
        this.position = {
            x: 0,
            z: 0
        };
        this.velocity = null;
        this.sequence = 0;
        this.uidCounter = 0;
        this.evicted = 0;
        this.cancelled = 0;
        this.ledgers = {};
        this.classPriority = {};
        if (zaisa.classPriority !== undefined) {
            if (!zaisa.classPriority || typeof zaisa.classPriority !== "object") throw new Error("ResidencyManager classPriority must be an object of class name to number");
            for (var zaisk in zaisa.classPriority) {
                var zaisl = zaisa.classPriority[zaisk];
                if (typeof zaisl !== "number" || !isFinite(zaisl)) throw new Error("ResidencyManager classPriority values must be finite numbers");
                this.classPriority[zaisk] = zaisl;
            }
        }
        this.budgets = {
            geometry: Infinity,
            texture: Infinity,
            splat: Infinity
        };
        if (zaisa.budgets !== undefined) {
            if (!zaisa.budgets || typeof zaisa.budgets !== "object") throw new Error("ResidencyManager budgets must be an object of class name to bytes");
            for (var zaism in zaisa.budgets) this.setBudget(zaism, zaisa.budgets[zaism]);
        }
    }
    setBudget(zaisa, zaisb) {
        if (typeof zaisa !== "string" || !zaisa) throw new Error("ResidencyManager.setBudget requires a non-empty class name");
        if (typeof zaisb !== "number" || zaisb !== Infinity && (!isFinite(zaisb) || zaisb < 0)) throw new Error("ResidencyManager.setBudget requires a non-negative byte count or Infinity");
        this.budgets[zaisa] = zaisb;
        this.enforceBudgets();
        return this;
    }
    addTile(zaisa) {
        if (!zaisa || typeof zaisa !== "object") throw new Error("ResidencyManager.addTile requires a tile specification object");
        var zaisb = zaisa.id;
        if (zaisb === undefined || zaisb === null || typeof zaisb !== "string" && typeof zaisb !== "number") throw new Error("ResidencyManager tile id must be a string or a number");
        if (this.has(zaisb)) throw new Error("ResidencyManager tile already registered: " + zaisb);
        if (typeof zaisa.load !== "function") throw new Error("ResidencyManager tile load must be a function: " + zaisb);
        if (typeof zaisa.x !== "number" || !isFinite(zaisa.x) || typeof zaisa.z !== "number" || !isFinite(zaisa.z)) throw new Error("ResidencyManager tile x and z must be finite numbers: " + zaisb);
        var zaisc = zaisa.class === undefined ? "geometry" : zaisa.class;
        if (typeof zaisc !== "string" || !zaisc) throw new Error("ResidencyManager tile class must be a non-empty string: " + zaisb);
        var zaisd = zaisa.cpuBytes === undefined ? 0 : zaisa.cpuBytes;
        var zaise = zaisa.gpuBytes === undefined ? 0 : zaisa.gpuBytes;
        if (typeof zaisd !== "number" || !isFinite(zaisd) || zaisd < 0) throw new Error("ResidencyManager tile cpuBytes must be a non-negative finite number: " + zaisb);
        if (typeof zaise !== "number" || !isFinite(zaise) || zaise < 0) throw new Error("ResidencyManager tile gpuBytes must be a non-negative finite number: " + zaisb);
        if (zaisa.unload !== undefined && zaisa.unload !== null && typeof zaisa.unload !== "function") throw new Error("ResidencyManager tile unload must be a function: " + zaisb);
        var zaisf = {
            id: zaisb,
            x: zaisa.x,
            z: zaisa.z,
            class: zaisc,
            cpuBytes: zaisd,
            gpuBytes: zaise,
            load: zaisa.load,
            unload: zaisa.unload || null,
            pinned: zaisa.pinned === true,
            state: "idle",
            handle: null,
            token: null,
            priority: 0,
            distance: Infinity,
            ring: -1,
            lastUse: 0,
            loadedAt: 0,
            retries: 0,
            error: null,
            gpuBytesUsed: 0,
            seq: 0,
            uid: ++this.uidCounter
        };
        if (this.tiles.set) this.tiles.set(zaisb, zaisf); else this.tiles[zaisb] = zaisf;
        return this;
    }
    addTiles(zaisa) {
        if (!Array.isArray(zaisa)) throw new Error("ResidencyManager.addTiles requires an array of tile specifications");
        for (var zaisb = 0; zaisb < zaisa.length; zaisb++) this.addTile(zaisa[zaisb]);
        return this;
    }
    has(zaisa) {
        return this.tiles.has ? this.tiles.has(zaisa) : Object.prototype.hasOwnProperty.call(this.tiles, zaisa);
    }
    tile(zaisa) {
        var zaisb = this.tiles.get ? this.tiles.get(zaisa) : this.has(zaisa) ? this.tiles[zaisa] : undefined;
        if (!zaisb) throw new Error("ResidencyManager unknown tile: " + zaisa);
        return zaisb;
    }
    getTile(zaisa) {
        var zaisb = this.tile(zaisa);
        return {
            id: zaisb.id,
            x: zaisb.x,
            z: zaisb.z,
            class: zaisb.class,
            state: zaisb.state,
            pinned: zaisb.pinned,
            ring: zaisb.ring,
            distance: zaisb.distance,
            cpuBytes: zaisb.cpuBytes,
            gpuBytes: zaisb.gpuBytes,
            gpuBytesUsed: zaisb.gpuBytesUsed,
            lastUse: zaisb.lastUse,
            loadedAt: zaisb.loadedAt,
            retries: zaisb.retries,
            error: zaisb.error === undefined ? null : zaisb.error
        };
    }
    removeTile(zaisa) {
        var zaisb = this.tile(zaisa);
        if (zaisb.state === "queued") {
            this.dequeue(zaisb);
            zaisb.state = "idle";
        } else if (zaisb.state === "resident") {
            this.evictTile(zaisb, "removed");
        } else if (zaisb.state === "loading") {
            if (zaisb.token) {
                zaisb.token.cancelled = true;
                if (zaisb.token._resolveCancelled) zaisb.token._resolveCancelled();
            }
            zaisb.state = "idle";
            zaisb.token = null;
        }
        if (this.tiles.delete) this.tiles.delete(zaisa); else delete this.tiles[zaisa];
        return this;
    }
    pin(zaisa) {
        var zaisb = this.tile(zaisa);
        zaisb.pinned = true;
        if (zaisb.state === "failed") {
            zaisb.retries = 0;
            zaisb.error = null;
            zaisb.state = "idle";
        }
        if (zaisb.state === "idle") this.enqueue(zaisb);
        this.pump();
        return this;
    }
    unpin(zaisa) {
        var zaisb = this.tile(zaisa);
        zaisb.pinned = false;
        return this;
    }
    touch(zaisa) {
        var zaisb = this.tile(zaisa);
        zaisb.lastUse = this.clock();
        return true;
    }
    cancel(zaisa) {
        var zaisb = this.tile(zaisa);
        if (zaisb.state === "queued") {
            this.dequeue(zaisb);
            zaisb.state = "idle";
            this.cancelled++;
            return true;
        }
        if (zaisb.state === "loading" && zaisb.token && !zaisb.token.cancelled) {
            zaisb.token.cancelled = true;
            if (zaisb.token._resolveCancelled) zaisb.token._resolveCancelled();
            this.cancelled++;
            return true;
        }
        return false;
    }
    reset(zaisa) {
        var zaisb = this.tile(zaisa);
        if (zaisb.state === "failed") {
            zaisb.retries = 0;
            zaisb.error = null;
            zaisb.state = "idle";
        }
        return this;
    }
    ringForDistance(zaisa) {
        for (var zaisb = 0; zaisb < this.rings.length; zaisb++) if (zaisa <= this.rings[zaisb]) return zaisb;
        return -1;
    }
    priorityFor(zaisa) {
        var zaisb = zaisa.ring >= 0 ? (this.rings.length - zaisa.ring) * 1e3 : 0;
        var zaisc = this.unloadRadius > 0 ? Math.max(0, 1 - zaisa.distance / this.unloadRadius) * 100 : 0;
        var zaisd = 0;
        if (this.velocity) {
            var zaise = this.velocity.x, zaisf = this.velocity.z;
            var zaisg = Math.sqrt(zaise * zaise + zaisf * zaisf);
            if (zaisg > 1e-6 && zaisa.distance > 1e-6) {
                var zaish = (zaisa.x - this.position.x) / zaisa.distance;
                var zaisi = (zaisa.z - this.position.z) / zaisa.distance;
                zaisd = (zaish * zaise + zaisi * zaisf) / zaisg * this.velocityWeight;
            }
        }
        var zaisj = this.classPriority[zaisa.class] === undefined ? 0 : this.classPriority[zaisa.class];
        var zaisk = zaisa.pinned ? 1e12 : 0;
        return zaisb + zaisc + zaisd + zaisj + zaisk;
    }
    update(zaisa, zaisb) {
        if (!zaisa || typeof zaisa !== "object" || typeof zaisa.x !== "number" || !isFinite(zaisa.x) || typeof zaisa.z !== "number" || !isFinite(zaisa.z)) throw new Error("ResidencyManager.update requires a position with finite numeric x and z");
        if (zaisb !== undefined && zaisb !== null && (typeof zaisb !== "object" || typeof zaisb.x !== "number" || !isFinite(zaisb.x) || typeof zaisb.z !== "number" || !isFinite(zaisb.z))) throw new Error("ResidencyManager.update velocity must be null or have finite numeric x and z");
        this.position.x = zaisa.x;
        this.position.z = zaisa.z;
        this.velocity = zaisb || null;
        var zaisc = this.clock();
        var zaisd = this;
        var zaise = [];
        var zaisf = this.tiles.forEach ? function(zaisa) {
            zaisd.tiles.forEach(zaisa);
        } : function(zaisa) {
            for (var zaisb in zaisd.tiles) if (Object.prototype.hasOwnProperty.call(zaisd.tiles, zaisb)) zaisa(zaisd.tiles[zaisb]);
        };
        zaisf(function(zaisa) {
            var zaisb = zaisa.x - zaisd.position.x;
            var zaisf = zaisa.z - zaisd.position.z;
            zaisa.distance = Math.sqrt(zaisb * zaisb + zaisf * zaisf);
            zaisa.ring = zaisd.ringForDistance(zaisa.distance);
            if (zaisa.ring >= 0) zaisa.lastUse = zaisc;
            if (zaisa.state === "resident" && !zaisa.pinned && zaisa.distance > zaisd.unloadRadius) zaisd.evictTile(zaisa, "distance"); else if ((zaisa.state === "queued" || zaisa.state === "loading") && zaisa.distance > zaisd.unloadRadius) zaisd.cancel(zaisa.id);
            if ((zaisa.state === "idle" || zaisa.state === "failed" && zaisa.retries <= zaisd.maxRetries) && zaisa.ring >= 0) {
                zaisa.priority = zaisd.priorityFor(zaisa);
                zaise.push(zaisa);
            }
        });
        for (var zaisg = this.queue.length - 1; zaisg >= 0; zaisg--) {
            if (this.queue[zaisg].state !== "queued") this.queue.splice(zaisg, 1); else this.queue[zaisg].priority = this.priorityFor(this.queue[zaisg]);
        }
        zaise.sort(function(zaisa, zaisb) {
            return zaisb.priority - zaisa.priority || zaisa.distance - zaisb.distance || zaisa.uid - zaisb.uid;
        });
        var zaish = 0;
        for (var zaisi = 0; zaisi < zaise.length; zaisi++) {
            var zaisj = zaise[zaisi];
            var zaisk = zaisj.cpuBytes + zaisj.gpuBytes;
            if (this.maxBytesPerUpdate !== Infinity && zaish > 0 && zaish + zaisk > this.maxBytesPerUpdate) break;
            this.enqueue(zaisj);
            zaish += zaisk;
        }
        this.sortQueue();
        this.enforceBudgets();
        this.pump();
        return this.stats();
    }
    enqueue(zaisa) {
        zaisa.state = "queued";
        zaisa.seq = ++this.sequence;
        zaisa.priority = this.priorityFor(zaisa);
        this.queue.push(zaisa);
        return this;
    }
    dequeue(zaisa) {
        for (var zaisb = 0; zaisb < this.queue.length; zaisb++) if (this.queue[zaisb] === zaisa) {
            this.queue.splice(zaisb, 1);
            break;
        }
        return this;
    }
    sortQueue() {
        this.queue.sort(function(zaisa, zaisb) {
            return zaisb.priority - zaisa.priority || zaisa.seq - zaisb.seq;
        });
        return this;
    }
    pump() {
        var zaisa = 0;
        while (this.inflight < this.maxInflight && this.queue.length > 0 && zaisa++ < 1e6) {
            var zaisb = this.queue.shift();
            if (!zaisb || zaisb.state !== "queued") continue;
            this.startLoad(zaisb);
        }
        return this;
    }
    startLoad(zaisa) {
        zaisa.state = "loading";
        this.inflight++;
        var zaisb = {
            cancelled: false
        };
        zaisb.whenCancelled = new Promise(function(zaisa) {
            zaisb._resolveCancelled = zaisa;
        });
        zaisb.throwIfCancelled = function() {
            if (zaisb.cancelled) throw new Error("ResidencyManager load cancelled: " + zaisa.id);
        };
        zaisa.token = zaisb;
        var zaisc = this;
        Promise.resolve().then(function() {
            return zaisa.load(zaisb);
        }).then(function(zaisd) {
            zaisc.inflight--;
            if (zaisa.state === "loading" && zaisa.token === zaisb) {
                if (zaisb.cancelled) {
                    zaisc.unloadHandle(zaisa, zaisd, "cancel");
                    zaisa.state = "idle";
                    zaisa.token = null;
                } else {
                    zaisc.markResident(zaisa, zaisd);
                    zaisc.enforceBudgets();
                }
            } else {
                zaisc.unloadHandle(zaisa, zaisd, "cancel");
            }
            zaisc.pump();
        }).catch(function(zaisd) {
            zaisc.inflight--;
            if (zaisa.state === "loading" && zaisa.token === zaisb && !zaisb.cancelled) {
                zaisa.error = zaisd;
                zaisa.retries++;
                zaisa.state = zaisa.retries > zaisc.maxRetries ? "failed" : "idle";
                zaisa.token = null;
            } else if (zaisa.state === "loading" && zaisa.token === zaisb) {
                zaisa.state = "idle";
                zaisa.token = null;
            }
            zaisc.pump();
        });
        return this;
    }
    markResident(zaisa, zaisb) {
        var zaisc = this.clock();
        zaisa.state = "resident";
        zaisa.handle = zaisb === undefined || zaisb === null ? null : zaisb;
        zaisa.token = null;
        zaisa.lastUse = zaisc;
        zaisa.loadedAt = zaisc;
        zaisa.error = null;
        zaisa.gpuBytesUsed = zaisa.handle && typeof zaisa.handle.gpuBytes === "number" && isFinite(zaisa.handle.gpuBytes) && zaisa.handle.gpuBytes >= 0 ? zaisa.handle.gpuBytes : zaisa.gpuBytes;
        var zaisd = this.ledgerFor(zaisa.class);
        zaisd.resident++;
        zaisd.bytes += zaisa.cpuBytes + zaisa.gpuBytesUsed;
        zaisd.gpuBytes += zaisa.gpuBytesUsed;
        if (this.onLoad) this.onLoad(zaisa, zaisa.handle);
        return this;
    }
    ledgerFor(zaisa) {
        if (!this.ledgers[zaisa]) this.ledgers[zaisa] = {
            resident: 0,
            bytes: 0,
            gpuBytes: 0
        };
        return this.ledgers[zaisa];
    }
    unloadHandle(zaisa, zaisb, zaisc) {
        if (zaisb === undefined || zaisb === null) return this;
        if (Array.isArray(zaisb.gpu)) {
            for (var zaisd = 0; zaisd < zaisb.gpu.length; zaisd++) {
                var zaise = zaisb.gpu[zaisd];
                if (zaise && typeof zaise.destroy === "function") zaise.destroy();
            }
        }
        if (this.resourceManager && Array.isArray(zaisb.cpu)) {
            var zaisf = this.resourceManager;
            var zaisg = [ zaisf.buffers, zaisf.textures, zaisf.cubeTextures, zaisf.volumeTextures, zaisf.boneBuffers ];
            for (var zaish = 0; zaish < zaisb.cpu.length; zaish++) {
                var zaisi = zaisb.cpu[zaish];
                if (!zaisi) continue;
                for (var zaisj = 0; zaisj < zaisg.length; zaisj++) if (zaisg[zaisj] && typeof zaisg[zaisj].delete === "function") zaisg[zaisj].delete(zaisi);
            }
        }
        if (zaisa.unload) zaisa.unload(zaisb, zaisc);
        return this;
    }
    evictTile(zaisa, zaisb) {
        zaisa.state = "idle";
        var zaisc = zaisa.handle;
        zaisa.handle = null;
        var zaisd = this.ledgers[zaisa.class];
        if (zaisd) {
            zaisd.resident--;
            zaisd.bytes -= zaisa.cpuBytes + zaisa.gpuBytesUsed;
            zaisd.gpuBytes -= zaisa.gpuBytesUsed;
        }
        zaisa.gpuBytesUsed = 0;
        this.unloadHandle(zaisa, zaisc, zaisb);
        this.evicted++;
        if (this.onEvict) this.onEvict(zaisa, zaisb);
        return this;
    }
    eligibleForBudgetEviction(zaisa, zaisb) {
        if (zaisa.pinned || zaisa.state !== "resident") return false;
        return zaisb - zaisa.loadedAt >= this.minResidentMs;
    }
    enforceBudgets() {
        var zaisa = this.clock();
        var zaisb = [];
        for (var zaisc in this.budgets) zaisb.push(zaisc);
        for (var zaisd in this.ledgers) if (zaisb.indexOf(zaisd) === -1) zaisb.push(zaisd);
        for (var zaise = 0; zaise < zaisb.length; zaise++) {
            var zaisf = zaisb[zaise];
            var zaisg = this.budgets[zaisf] === undefined ? Infinity : this.budgets[zaisf];
            if (zaisg === Infinity) continue;
            var zaish = this.ledgers[zaisf];
            if (!zaish || zaish.bytes <= zaisg) continue;
            var zaisi = 0;
            while (zaish.bytes > zaisg && zaisi++ < 1e6) {
                var zaisj = this.budgetCandidate(zaisf, zaisa, true);
                if (!zaisj) zaisj = this.budgetCandidate(zaisf, zaisa, false);
                if (!zaisj) break;
                this.evictTile(zaisj, "budget");
            }
        }
        return this;
    }
    budgetCandidate(zaisa, zaisb, zaisc) {
        var zaisd = null;
        var zaise = this;
        var zaisf = this.tiles.forEach ? function(zaisa) {
            zaise.tiles.forEach(zaisa);
        } : function(zaisa) {
            for (var zaisb in zaise.tiles) if (Object.prototype.hasOwnProperty.call(zaise.tiles, zaisb)) zaisa(zaise.tiles[zaisb]);
        };
        zaisf(function(zaisf) {
            if (zaisf.class !== zaisa) return;
            if (!zaise.eligibleForBudgetEviction(zaisf, zaisb)) return;
            var zaisg = zaisf.x - zaise.position.x;
            var zaish = zaisf.z - zaise.position.z;
            zaisf.distance = Math.sqrt(zaisg * zaisg + zaish * zaish);
            zaisf.ring = zaise.ringForDistance(zaisf.distance);
            if (zaisc && zaisf.ring === 0) return;
            if (!zaisd) {
                zaisd = zaisf;
                return;
            }
            if (zaisf.lastUse < zaisd.lastUse || zaisf.lastUse === zaisd.lastUse && (zaisf.ring > zaisd.ring || zaisf.ring === zaisd.ring && (zaisf.distance > zaisd.distance || zaisf.distance === zaisd.distance && zaisf.uid < zaisd.uid))) zaisd = zaisf;
        });
        return zaisd;
    }
    stats() {
        var zaisa = 0, zaisb = this.queue.length, zaisc = this.inflight, zaisd = 0, zaise = 0;
        var zaisf = this;
        var zaisg = this.tiles.forEach ? function(zaisa) {
            zaisf.tiles.forEach(zaisa);
        } : function(zaisa) {
            for (var zaisb in zaisf.tiles) if (Object.prototype.hasOwnProperty.call(zaisf.tiles, zaisb)) zaisa(zaisf.tiles[zaisb]);
        };
        zaisg(function(zaisb) {
            zaise++;
            if (zaisb.state === "resident") zaisa++;
            if (zaisb.state === "failed") zaisd++;
        });
        var zaish = {};
        var zaisi = 0, zaisj = 0;
        for (var zaisk in this.ledgers) {
            var zaisl = this.ledgers[zaisk];
            zaish[zaisk] = {
                resident: zaisl.resident,
                bytes: zaisl.bytes,
                gpuBytes: zaisl.gpuBytes,
                budget: this.budgets[zaisk] === undefined ? Infinity : this.budgets[zaisk]
            };
            zaisi += zaisl.bytes;
            zaisj += zaisl.gpuBytes;
        }
        for (var zaism in this.budgets) if (!zaish[zaism]) zaish[zaism] = {
            resident: 0,
            bytes: 0,
            gpuBytes: 0,
            budget: this.budgets[zaism]
        };
        return {
            tiles: zaise,
            resident: zaisa,
            queued: zaisb,
            inflight: zaisc,
            failed: zaisd,
            evicted: this.evicted,
            cancelled: this.cancelled,
            bytes: zaisi,
            gpuBytes: zaisj,
            rings: this.rings.slice(),
            unloadRadius: this.unloadRadius,
            classes: zaish
        };
    }
    dispose() {
        this.queue = [];
        var zaisa = this;
        var zaisb = [];
        var zaisc = this.tiles.forEach ? function(zaisb) {
            zaisa.tiles.forEach(zaisb);
        } : function(zaisb) {
            for (var zaisc in zaisa.tiles) if (Object.prototype.hasOwnProperty.call(zaisa.tiles, zaisc)) zaisb(zaisa.tiles[zaisc]);
        };
        zaisc(function(zaisa) {
            zaisb.push(zaisa);
        });
        for (var zaisd = 0; zaisd < zaisb.length; zaisd++) {
            var zaise = zaisb[zaisd];
            if (zaise.state === "queued") zaise.state = "idle"; else if (zaise.state === "resident") this.evictTile(zaise, "dispose"); else if (zaise.state === "loading" && zaise.token) {
                zaise.token.cancelled = true;
                if (zaise.token._resolveCancelled) zaise.token._resolveCancelled();
                zaise.state = "idle";
                zaise.token = null;
            }
        }
        if (this.tiles.clear) this.tiles.clear(); else this.tiles = {};
        return this;
    }
}

export { ResidencyManager };
