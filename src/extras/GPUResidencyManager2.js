class GPUResidencyManager2 {
    constructor(options) {
        options = options || {};
        this.budget = options.budgetBytes || 512 * 1024 * 1024;
        this.categoryBudgets = Object.assign({}, options.categoryBudgets || {});
        this.resources = new Map;
        this.residentBytes = 0;
        this.frame = 0;
        this.clock = typeof options.clock === "function" ? options.clock : function() { return typeof performance !== "undefined" ? performance.now() : Date.now(); };
        this.onEvict = typeof options.onEvict === "function" ? options.onEvict : null;
        this.onResident = typeof options.onResident === "function" ? options.onResident : null;
        this.stats = { registered: 0, loaded: 0, evicted: 0, failed: 0, requestedBytes: 0, peakBytes: 0, budgetPressure: 0 };
    }
    register(id, options) {
        options = options || {};
        if (this.resources.has(id)) throw new Error("GPUResidencyManager2 duplicate resource " + id);
        var resource = {
            id: id,
            category: options.category || "other",
            bytes: Math.max(0, options.bytes || 0),
            load: options.load || null,
            unload: options.unload || null,
            state: options.resident ? "resident" : "idle",
            value: options.value === undefined ? 1 : options.value,
            regenerationCost: options.regenerationCost || 0,
            downloadCost: options.downloadCost || 0,
            probability: options.probability || 0,
            distance: options.distance === undefined ? Infinity : options.distance,
            importance: options.importance === undefined ? 1 : options.importance,
            pinned: options.pinned === true,
            lastUse: this.frame,
            lastTime: this.clock(),
            handle: options.handle || null,
            promise: null,
            error: null,
            generation: 0
        };
        this.resources.set(id, resource);
        if (resource.state === "resident") this.residentBytes += resource.bytes;
        this.stats.registered++;
        this.stats.peakBytes = Math.max(this.stats.peakBytes, this.residentBytes);
        if (resource.state === "resident") this.enforce();
        return this;
    }
    unregister(id) {
        var resource = this.resources.get(id);
        if (!resource) return false;
        if (resource.state === "resident") this.evict(id, "unregister");
        this.resources.delete(id);
        return true;
    }
    setBudget(bytes, category) {
        if (!(bytes >= 0)) throw new Error("GPUResidencyManager2 budget must be non-negative");
        if (category) this.categoryBudgets[category] = bytes; else this.budget = bytes;
        this.enforce();
        return this;
    }
    touch(id, values) {
        var resource = this.resources.get(id);
        if (!resource) return false;
        values = values || {};
        resource.lastUse = this.frame;
        resource.lastTime = this.clock();
        if (values.value !== undefined) resource.value = values.value;
        if (values.probability !== undefined) resource.probability = values.probability;
        if (values.distance !== undefined) resource.distance = values.distance;
        if (values.importance !== undefined) resource.importance = values.importance;
        return true;
    }
    score(resource) {
        if (resource.pinned) return Infinity;
        var age = Math.max(0, this.frame - resource.lastUse);
        var distance = isFinite(resource.distance) ? 1 / (1 + resource.distance) : 0;
        var future = resource.probability * 4;
        var recovery = Math.log2(2 + resource.downloadCost + resource.regenerationCost) * .1;
        return resource.value * resource.importance + distance + future + recovery - age * .01;
    }
    async makeResident(id, context) {
        var resource = this.resources.get(id);
        if (!resource) throw new Error("GPUResidencyManager2 unknown resource " + id);
        if (resource.state === "resident") {
            this.touch(id);
            return resource.handle;
        }
        if (resource.promise) return resource.promise;
        resource.state = "loading";
        resource.generation++;
        var generation = resource.generation;
        this.stats.requestedBytes += resource.bytes;
        resource.promise = Promise.resolve(resource.load ? resource.load(context, resource) : resource.handle).then(handle => {
            if (resource.generation !== generation) return null;
            resource.handle = handle;
            resource.state = "resident";
            resource.promise = null;
            resource.error = null;
            resource.lastUse = this.frame;
            this.residentBytes += resource.bytes;
            this.stats.loaded++;
            this.stats.peakBytes = Math.max(this.stats.peakBytes, this.residentBytes);
            if (this.onResident) this.onResident(resource, this);
            this.enforce();
            return handle;
        }).catch(error => {
            resource.promise = null;
            resource.state = "failed";
            resource.error = error;
            this.stats.failed++;
            throw error;
        });
        return resource.promise;
    }
    evict(id, reason) {
        var resource = this.resources.get(id);
        if (!resource || resource.state !== "resident" || resource.pinned) return false;
        if (resource.unload) resource.unload(resource.handle, reason || "budget", resource);
        resource.handle = null;
        resource.state = "idle";
        resource.generation++;
        this.residentBytes = Math.max(0, this.residentBytes - resource.bytes);
        this.stats.evicted++;
        if (this.onEvict) this.onEvict(resource, reason || "budget", this);
        return true;
    }
    categoryBytes(category) {
        var bytes = 0;
        this.resources.forEach(function(resource) { if (resource.state === "resident" && resource.category === category) bytes += resource.bytes; });
        return bytes;
    }
    candidates(category) {
        var result = [];
        this.resources.forEach(resource => {
            if (resource.state === "resident" && !resource.pinned && (!category || resource.category === category)) result.push(resource);
        });
        var self = this;
        result.sort(function(a, b) { return self.score(a) - self.score(b) || b.bytes - a.bytes; });
        return result;
    }
    enforce() {
        var categories = Object.keys(this.categoryBudgets);
        for (var categoryindex = 0; categoryindex < categories.length; categoryindex++) {
            var category = categories[categoryindex];
            var budget = this.categoryBudgets[category];
            var bytes = this.categoryBytes(category);
            var categorycandidates = this.candidates(category);
            for (var index = 0; bytes > budget && index < categorycandidates.length; index++) {
                bytes -= categorycandidates[index].bytes;
                this.evict(categorycandidates[index].id, "category-budget");
            }
        }
        var candidates = this.candidates();
        for (var candidate = 0; this.residentBytes > this.budget && candidate < candidates.length; candidate++) this.evict(candidates[candidate].id, "global-budget");
        this.stats.budgetPressure = this.budget > 0 ? this.residentBytes / this.budget : this.residentBytes > 0 ? Infinity : 0;
        return this;
    }
    predict(entries) {
        entries = entries || [];
        for (var index = 0; index < entries.length; index++) {
            var entry = entries[index];
            this.touch(entry.id, { probability: entry.probability, distance: entry.distance, importance: entry.importance });
        }
        return this;
    }
    update() {
        this.frame++;
        this.enforce();
        return this;
    }
    report() {
        var categories = Object.create(null);
        this.resources.forEach(function(resource) {
            if (!categories[resource.category]) categories[resource.category] = { registered: 0, resident: 0, bytes: 0 };
            categories[resource.category].registered++;
            if (resource.state === "resident") {
                categories[resource.category].resident++;
                categories[resource.category].bytes += resource.bytes;
            }
        });
        return {
            budgetBytes: this.budget,
            residentBytes: this.residentBytes,
            pressure: this.budget > 0 ? this.residentBytes / this.budget : 0,
            categories: categories,
            stats: Object.assign({}, this.stats)
        };
    }
}

export { GPUResidencyManager2 };
