class ResidencyManager {
    constructor(options) {
        options = options || {};
        var rings = options.rings === undefined ? [64, 128, 256] : options.rings;
        if (!Array.isArray(rings) || rings.length === 0) throw new Error("ResidencyManager requires a non-empty rings array of radii");
        for (var ri = 0; ri < rings.length; ri++) {
            var rv = rings[ri];
            if (typeof rv !== "number" || !isFinite(rv) || rv <= 0) throw new Error("ResidencyManager ring radii must be positive finite numbers");
            if (ri > 0 && rv <= rings[ri - 1]) throw new Error("ResidencyManager ring radii must be strictly increasing");
        }
        this.rings = rings.slice();
        var hysteresis = options.hysteresis === undefined ? this.rings[0] : options.hysteresis;
        if (typeof hysteresis !== "number" || !isFinite(hysteresis) || hysteresis < 0) throw new Error("ResidencyManager hysteresis must be a non-negative finite number");
        this.hysteresis = hysteresis;
        this.unloadRadius = this.rings[this.rings.length - 1] + this.hysteresis;
        var maxInflight = options.maxInflight === undefined ? 4 : options.maxInflight;
        if (typeof maxInflight !== "number" || !isFinite(maxInflight) || Math.floor(maxInflight) !== maxInflight || maxInflight < 1) throw new Error("ResidencyManager maxInflight must be an integer of at least 1");
        this.maxInflight = maxInflight;
        var maxRetries = options.maxRetries === undefined ? 2 : options.maxRetries;
        if (typeof maxRetries !== "number" || !isFinite(maxRetries) || Math.floor(maxRetries) !== maxRetries || maxRetries < 0) throw new Error("ResidencyManager maxRetries must be a non-negative integer");
        this.maxRetries = maxRetries;
        var minResidentMs = options.minResidentMs === undefined ? 0 : options.minResidentMs;
        if (typeof minResidentMs !== "number" || !isFinite(minResidentMs) || minResidentMs < 0) throw new Error("ResidencyManager minResidentMs must be a non-negative finite number");
        this.minResidentMs = minResidentMs;
        var velocityWeight = options.velocityWeight === undefined ? 20 : options.velocityWeight;
        if (typeof velocityWeight !== "number" || !isFinite(velocityWeight) || velocityWeight < 0) throw new Error("ResidencyManager velocityWeight must be a non-negative finite number");
        this.velocityWeight = velocityWeight;
        var maxBytesPerUpdate = options.maxBytesPerUpdate === undefined ? Infinity : options.maxBytesPerUpdate;
        if (typeof maxBytesPerUpdate !== "number" || (maxBytesPerUpdate !== Infinity && (!isFinite(maxBytesPerUpdate) || maxBytesPerUpdate < 0))) throw new Error("ResidencyManager maxBytesPerUpdate must be a non-negative finite number or Infinity");
        this.maxBytesPerUpdate = maxBytesPerUpdate;
        this.resourceManager = options.resourceManager || null;
        this.clock = typeof options.clock === "function" ? options.clock : (typeof performance !== "undefined" && performance && typeof performance.now === "function" ? function () { return performance.now(); } : function () { return Date.now(); });
        this.onLoad = typeof options.onLoad === "function" ? options.onLoad : null;
        this.onEvict = typeof options.onEvict === "function" ? options.onEvict : null;
        this.tiles = typeof Map !== "undefined" ? new Map() : {};
        this.queue = [];
        this.inflight = 0;
        this.position = { x: 0, z: 0 };
        this.velocity = null;
        this.sequence = 0;
        this.uidCounter = 0;
        this.evicted = 0;
        this.cancelled = 0;
        this.ledgers = {};
        this.classPriority = {};
        if (options.classPriority !== undefined) {
            if (!options.classPriority || typeof options.classPriority !== "object") throw new Error("ResidencyManager classPriority must be an object of class name to number");
            for (var cp in options.classPriority) {
                var cpv = options.classPriority[cp];
                if (typeof cpv !== "number" || !isFinite(cpv)) throw new Error("ResidencyManager classPriority values must be finite numbers");
                this.classPriority[cp] = cpv;
            }
        }
        this.budgets = { geometry: Infinity, texture: Infinity, splat: Infinity };
        if (options.budgets !== undefined) {
            if (!options.budgets || typeof options.budgets !== "object") throw new Error("ResidencyManager budgets must be an object of class name to bytes");
            for (var bk in options.budgets) this.setBudget(bk, options.budgets[bk]);
        }
    }
    setBudget(tileClass, bytes) {
        if (typeof tileClass !== "string" || !tileClass) throw new Error("ResidencyManager.setBudget requires a non-empty class name");
        if (typeof bytes !== "number" || (bytes !== Infinity && (!isFinite(bytes) || bytes < 0))) throw new Error("ResidencyManager.setBudget requires a non-negative byte count or Infinity");
        this.budgets[tileClass] = bytes;
        this.enforceBudgets();
        return this;
    }
    addTile(spec) {
        if (!spec || typeof spec !== "object") throw new Error("ResidencyManager.addTile requires a tile specification object");
        var id = spec.id;
        if (id === undefined || id === null || (typeof id !== "string" && typeof id !== "number")) throw new Error("ResidencyManager tile id must be a string or a number");
        if (this.has(id)) throw new Error("ResidencyManager tile already registered: " + id);
        if (typeof spec.load !== "function") throw new Error("ResidencyManager tile load must be a function: " + id);
        if (typeof spec.x !== "number" || !isFinite(spec.x) || typeof spec.z !== "number" || !isFinite(spec.z)) throw new Error("ResidencyManager tile x and z must be finite numbers: " + id);
        var tileClass = spec.class === undefined ? "geometry" : spec.class;
        if (typeof tileClass !== "string" || !tileClass) throw new Error("ResidencyManager tile class must be a non-empty string: " + id);
        var cpuBytes = spec.cpuBytes === undefined ? 0 : spec.cpuBytes;
        var gpuBytes = spec.gpuBytes === undefined ? 0 : spec.gpuBytes;
        if (typeof cpuBytes !== "number" || !isFinite(cpuBytes) || cpuBytes < 0) throw new Error("ResidencyManager tile cpuBytes must be a non-negative finite number: " + id);
        if (typeof gpuBytes !== "number" || !isFinite(gpuBytes) || gpuBytes < 0) throw new Error("ResidencyManager tile gpuBytes must be a non-negative finite number: " + id);
        if (spec.unload !== undefined && spec.unload !== null && typeof spec.unload !== "function") throw new Error("ResidencyManager tile unload must be a function: " + id);
        var tile = { id: id, x: spec.x, z: spec.z, class: tileClass, cpuBytes: cpuBytes, gpuBytes: gpuBytes, load: spec.load, unload: spec.unload || null, pinned: spec.pinned === true, state: "idle", handle: null, token: null, priority: 0, distance: Infinity, ring: -1, lastUse: 0, loadedAt: 0, retries: 0, error: null, gpuBytesUsed: 0, seq: 0, uid: ++this.uidCounter };
        if (this.tiles.set) this.tiles.set(id, tile); else this.tiles[id] = tile;
        return this;
    }
    addTiles(list) {
        if (!Array.isArray(list)) throw new Error("ResidencyManager.addTiles requires an array of tile specifications");
        for (var i = 0; i < list.length; i++) this.addTile(list[i]);
        return this;
    }
    has(id) {
        return this.tiles.has ? this.tiles.has(id) : Object.prototype.hasOwnProperty.call(this.tiles, id);
    }
    tile(id) {
        var tile = this.tiles.get ? this.tiles.get(id) : (this.has(id) ? this.tiles[id] : undefined);
        if (!tile) throw new Error("ResidencyManager unknown tile: " + id);
        return tile;
    }
    getTile(id) {
        var tile = this.tile(id);
        return { id: tile.id, x: tile.x, z: tile.z, class: tile.class, state: tile.state, pinned: tile.pinned, ring: tile.ring, distance: tile.distance, cpuBytes: tile.cpuBytes, gpuBytes: tile.gpuBytes, gpuBytesUsed: tile.gpuBytesUsed, lastUse: tile.lastUse, loadedAt: tile.loadedAt, retries: tile.retries, error: tile.error === undefined ? null : tile.error };
    }
    removeTile(id) {
        var tile = this.tile(id);
        if (tile.state === "queued") {
            this.dequeue(tile);
            tile.state = "idle";
        } else if (tile.state === "resident") {
            this.evictTile(tile, "removed");
        } else if (tile.state === "loading") {
            if (tile.token) { tile.token.cancelled = true; if (tile.token._resolveCancelled) tile.token._resolveCancelled(); }
            tile.state = "idle";
            tile.token = null;
        }
        if (this.tiles.delete) this.tiles.delete(id); else delete this.tiles[id];
        return this;
    }
    pin(id) {
        var tile = this.tile(id);
        tile.pinned = true;
        if (tile.state === "failed") { tile.retries = 0; tile.error = null; tile.state = "idle"; }
        if (tile.state === "idle") this.enqueue(tile);
        this.pump();
        return this;
    }
    unpin(id) {
        var tile = this.tile(id);
        tile.pinned = false;
        return this;
    }
    touch(id) {
        var tile = this.tile(id);
        tile.lastUse = this.clock();
        return true;
    }
    cancel(id) {
        var tile = this.tile(id);
        if (tile.state === "queued") {
            this.dequeue(tile);
            tile.state = "idle";
            this.cancelled++;
            return true;
        }
        if (tile.state === "loading" && tile.token && !tile.token.cancelled) {
            tile.token.cancelled = true;
            if (tile.token._resolveCancelled) tile.token._resolveCancelled();
            this.cancelled++;
            return true;
        }
        return false;
    }
    reset(id) {
        var tile = this.tile(id);
        if (tile.state === "failed") { tile.retries = 0; tile.error = null; tile.state = "idle"; }
        return this;
    }
    ringForDistance(distance) {
        for (var i = 0; i < this.rings.length; i++) if (distance <= this.rings[i]) return i;
        return -1;
    }
    priorityFor(tile) {
        var ringPart = tile.ring >= 0 ? (this.rings.length - tile.ring) * 1000 : 0;
        var proximity = this.unloadRadius > 0 ? Math.max(0, 1 - tile.distance / this.unloadRadius) * 100 : 0;
        var velocityBonus = 0;
        if (this.velocity) {
            var vx = this.velocity.x, vz = this.velocity.z;
            var speed = Math.sqrt(vx * vx + vz * vz);
            if (speed > 1e-6 && tile.distance > 1e-6) {
                var dirx = (tile.x - this.position.x) / tile.distance;
                var dirz = (tile.z - this.position.z) / tile.distance;
                velocityBonus = ((dirx * vx + dirz * vz) / speed) * this.velocityWeight;
            }
        }
        var classPriority = this.classPriority[tile.class] === undefined ? 0 : this.classPriority[tile.class];
        var pinnedBoost = tile.pinned ? 1e12 : 0;
        return ringPart + proximity + velocityBonus + classPriority + pinnedBoost;
    }
    update(position, velocity) {
        if (!position || typeof position !== "object" || typeof position.x !== "number" || !isFinite(position.x) || typeof position.z !== "number" || !isFinite(position.z)) throw new Error("ResidencyManager.update requires a position with finite numeric x and z");
        if (velocity !== undefined && velocity !== null && (typeof velocity !== "object" || typeof velocity.x !== "number" || !isFinite(velocity.x) || typeof velocity.z !== "number" || !isFinite(velocity.z))) throw new Error("ResidencyManager.update velocity must be null or have finite numeric x and z");
        this.position.x = position.x;
        this.position.z = position.z;
        this.velocity = velocity || null;
        var now = this.clock();
        var self = this;
        var requestable = [];
        var each = this.tiles.forEach ? function (visit) { self.tiles.forEach(visit); } : function (visit) { for (var k in self.tiles) if (Object.prototype.hasOwnProperty.call(self.tiles, k)) visit(self.tiles[k]); };
        each(function (tile) {
            var dx = tile.x - self.position.x;
            var dz = tile.z - self.position.z;
            tile.distance = Math.sqrt(dx * dx + dz * dz);
            tile.ring = self.ringForDistance(tile.distance);
            if (tile.ring >= 0) tile.lastUse = now;
            if (tile.state === "resident" && !tile.pinned && tile.distance > self.unloadRadius) self.evictTile(tile, "distance");
            else if ((tile.state === "queued" || tile.state === "loading") && tile.distance > self.unloadRadius) self.cancel(tile.id);
            if ((tile.state === "idle" || (tile.state === "failed" && tile.retries <= self.maxRetries)) && tile.ring >= 0) {
                tile.priority = self.priorityFor(tile);
                requestable.push(tile);
            }
        });
        for (var qi = this.queue.length - 1; qi >= 0; qi--) {
            if (this.queue[qi].state !== "queued") this.queue.splice(qi, 1);
            else this.queue[qi].priority = this.priorityFor(this.queue[qi]);
        }
        requestable.sort(function (a, b) { return b.priority - a.priority || a.distance - b.distance || a.uid - b.uid; });
        var queuedBytes = 0;
        for (var ri = 0; ri < requestable.length; ri++) {
            var tile = requestable[ri];
            var bytes = tile.cpuBytes + tile.gpuBytes;
            if (this.maxBytesPerUpdate !== Infinity && queuedBytes > 0 && queuedBytes + bytes > this.maxBytesPerUpdate) break;
            this.enqueue(tile);
            queuedBytes += bytes;
        }
        this.sortQueue();
        this.enforceBudgets();
        this.pump();
        return this.stats();
    }
    enqueue(tile) {
        tile.state = "queued";
        tile.seq = ++this.sequence;
        tile.priority = this.priorityFor(tile);
        this.queue.push(tile);
        return this;
    }
    dequeue(tile) {
        for (var i = 0; i < this.queue.length; i++) if (this.queue[i] === tile) { this.queue.splice(i, 1); break; }
        return this;
    }
    sortQueue() {
        this.queue.sort(function (a, b) { return b.priority - a.priority || a.seq - b.seq; });
        return this;
    }
    pump() {
        var guard = 0;
        while (this.inflight < this.maxInflight && this.queue.length > 0 && guard++ < 1e6) {
            var tile = this.queue.shift();
            if (!tile || tile.state !== "queued") continue;
            this.startLoad(tile);
        }
        return this;
    }
    startLoad(tile) {
        tile.state = "loading";
        this.inflight++;
        var token = { cancelled: false };
        token.whenCancelled = new Promise(function (resolve) { token._resolveCancelled = resolve; });
        token.throwIfCancelled = function () { if (token.cancelled) throw new Error("ResidencyManager load cancelled: " + tile.id); };
        tile.token = token;
        var self = this;
        Promise.resolve().then(function () { return tile.load(token); }).then(function (handle) {
            self.inflight--;
            if (tile.state === "loading" && tile.token === token) {
                if (token.cancelled) {
                    self.unloadHandle(tile, handle, "cancel");
                    tile.state = "idle";
                    tile.token = null;
                } else {
                    self.markResident(tile, handle);
                    self.enforceBudgets();
                }
            } else {
                self.unloadHandle(tile, handle, "cancel");
            }
            self.pump();
        }).catch(function (error) {
            self.inflight--;
            if (tile.state === "loading" && tile.token === token && !token.cancelled) {
                tile.error = error;
                tile.retries++;
                tile.state = tile.retries > self.maxRetries ? "failed" : "idle";
                tile.token = null;
            } else if (tile.state === "loading" && tile.token === token) {
                tile.state = "idle";
                tile.token = null;
            }
            self.pump();
        });
        return this;
    }
    markResident(tile, handle) {
        var now = this.clock();
        tile.state = "resident";
        tile.handle = handle === undefined || handle === null ? null : handle;
        tile.token = null;
        tile.lastUse = now;
        tile.loadedAt = now;
        tile.error = null;
        tile.gpuBytesUsed = tile.handle && typeof tile.handle.gpuBytes === "number" && isFinite(tile.handle.gpuBytes) && tile.handle.gpuBytes >= 0 ? tile.handle.gpuBytes : tile.gpuBytes;
        var ledger = this.ledgerFor(tile.class);
        ledger.resident++;
        ledger.bytes += tile.cpuBytes + tile.gpuBytesUsed;
        ledger.gpuBytes += tile.gpuBytesUsed;
        if (this.onLoad) this.onLoad(tile, tile.handle);
        return this;
    }
    ledgerFor(tileClass) {
        if (!this.ledgers[tileClass]) this.ledgers[tileClass] = { resident: 0, bytes: 0, gpuBytes: 0 };
        return this.ledgers[tileClass];
    }
    unloadHandle(tile, handle, reason) {
        if (handle === undefined || handle === null) return this;
        if (Array.isArray(handle.gpu)) {
            for (var i = 0; i < handle.gpu.length; i++) {
                var gpu = handle.gpu[i];
                if (gpu && typeof gpu.destroy === "function") gpu.destroy();
            }
        }
        if (this.resourceManager && Array.isArray(handle.cpu)) {
            var rm = this.resourceManager;
            var maps = [rm.buffers, rm.textures, rm.cubeTextures, rm.volumeTextures, rm.boneBuffers];
            for (var c = 0; c < handle.cpu.length; c++) {
                var cpu = handle.cpu[c];
                if (!cpu) continue;
                for (var m = 0; m < maps.length; m++) if (maps[m] && typeof maps[m].delete === "function") maps[m].delete(cpu);
            }
        }
        if (tile.unload) tile.unload(handle, reason);
        return this;
    }
    evictTile(tile, reason) {
        tile.state = "idle";
        var handle = tile.handle;
        tile.handle = null;
        var ledger = this.ledgers[tile.class];
        if (ledger) {
            ledger.resident--;
            ledger.bytes -= tile.cpuBytes + tile.gpuBytesUsed;
            ledger.gpuBytes -= tile.gpuBytesUsed;
        }
        tile.gpuBytesUsed = 0;
        this.unloadHandle(tile, handle, reason);
        this.evicted++;
        if (this.onEvict) this.onEvict(tile, reason);
        return this;
    }
    eligibleForBudgetEviction(tile, now) {
        if (tile.pinned || tile.state !== "resident") return false;
        return now - tile.loadedAt >= this.minResidentMs;
    }
    enforceBudgets() {
        var now = this.clock();
        var classes = [];
        for (var name in this.budgets) classes.push(name);
        for (var ledgerName in this.ledgers) if (classes.indexOf(ledgerName) === -1) classes.push(ledgerName);
        for (var i = 0; i < classes.length; i++) {
            var tileClass = classes[i];
            var budget = this.budgets[tileClass] === undefined ? Infinity : this.budgets[tileClass];
            if (budget === Infinity) continue;
            var ledger = this.ledgers[tileClass];
            if (!ledger || ledger.bytes <= budget) continue;
            var guard = 0;
            while (ledger.bytes > budget && guard++ < 1e6) {
                var candidate = this.budgetCandidate(tileClass, now, true);
                if (!candidate) candidate = this.budgetCandidate(tileClass, now, false);
                if (!candidate) break;
                this.evictTile(candidate, "budget");
            }
        }
        return this;
    }
    budgetCandidate(tileClass, now, protectRingZero) {
        var best = null;
        var self = this;
        var each = this.tiles.forEach ? function (visit) { self.tiles.forEach(visit); } : function (visit) { for (var k in self.tiles) if (Object.prototype.hasOwnProperty.call(self.tiles, k)) visit(self.tiles[k]); };
        each(function (tile) {
            if (tile.class !== tileClass) return;
            if (!self.eligibleForBudgetEviction(tile, now)) return;
            var dx = tile.x - self.position.x;
            var dz = tile.z - self.position.z;
            tile.distance = Math.sqrt(dx * dx + dz * dz);
            tile.ring = self.ringForDistance(tile.distance);
            if (protectRingZero && tile.ring === 0) return;
            if (!best) { best = tile; return; }
            if (tile.lastUse < best.lastUse || (tile.lastUse === best.lastUse && (tile.ring > best.ring || (tile.ring === best.ring && (tile.distance > best.distance || (tile.distance === best.distance && tile.uid < best.uid)))))) best = tile;
        });
        return best;
    }
    stats() {
        var resident = 0, queued = this.queue.length, inflight = this.inflight, failed = 0, total = 0;
        var self = this;
        var each = this.tiles.forEach ? function (visit) { self.tiles.forEach(visit); } : function (visit) { for (var k in self.tiles) if (Object.prototype.hasOwnProperty.call(self.tiles, k)) visit(self.tiles[k]); };
        each(function (tile) {
            total++;
            if (tile.state === "resident") resident++;
            if (tile.state === "failed") failed++;
        });
        var classes = {};
        var bytes = 0, gpuBytes = 0;
        for (var name in this.ledgers) {
            var ledger = this.ledgers[name];
            classes[name] = { resident: ledger.resident, bytes: ledger.bytes, gpuBytes: ledger.gpuBytes, budget: this.budgets[name] === undefined ? Infinity : this.budgets[name] };
            bytes += ledger.bytes;
            gpuBytes += ledger.gpuBytes;
        }
        for (var budgetName in this.budgets) if (!classes[budgetName]) classes[budgetName] = { resident: 0, bytes: 0, gpuBytes: 0, budget: this.budgets[budgetName] };
        return { tiles: total, resident: resident, queued: queued, inflight: inflight, failed: failed, evicted: this.evicted, cancelled: this.cancelled, bytes: bytes, gpuBytes: gpuBytes, rings: this.rings.slice(), unloadRadius: this.unloadRadius, classes: classes };
    }
    dispose() {
        this.queue = [];
        var self = this;
        var all = [];
        var each = this.tiles.forEach ? function (visit) { self.tiles.forEach(visit); } : function (visit) { for (var k in self.tiles) if (Object.prototype.hasOwnProperty.call(self.tiles, k)) visit(self.tiles[k]); };
        each(function (tile) { all.push(tile); });
        for (var i = 0; i < all.length; i++) {
            var tile = all[i];
            if (tile.state === "queued") tile.state = "idle";
            else if (tile.state === "resident") this.evictTile(tile, "dispose");
            else if (tile.state === "loading" && tile.token) { tile.token.cancelled = true; if (tile.token._resolveCancelled) tile.token._resolveCancelled(); tile.state = "idle"; tile.token = null; }
        }
        if (this.tiles.clear) this.tiles.clear();
        else this.tiles = {};
        return this;
    }
}

export { ResidencyManager };
