import { UnifiedSpatialDatabase } from "./UnifiedSpatialDatabase.js";

class PredictiveStreamer {
    constructor(options) {
        options = options || {};
        this.horizons = (options.horizons || [ 0, .5, 1.5, 3 ]).slice();
        this.velocityWeight = options.velocityWeight === undefined ? 1 : options.velocityWeight;
        this.directionWeight = options.directionWeight === undefined ? 32 : options.directionWeight;
        this.intentWeight = options.intentWeight === undefined ? 2 : options.intentWeight;
        this.points = [];
    }
    predict(position, velocity, direction, intents) {
        this.points.length = 0;
        position = position || { x: 0, y: 0, z: 0 };
        velocity = velocity || { x: 0, y: 0, z: 0 };
        direction = direction || { x: 0, y: 0, z: -1 };
        for (var index = 0; index < this.horizons.length; index++) {
            var horizon = this.horizons[index];
            this.points.push({
                x: position.x + velocity.x * horizon * this.velocityWeight + direction.x * this.directionWeight * Math.min(1, horizon),
                y: position.y + velocity.y * horizon * this.velocityWeight + direction.y * this.directionWeight * Math.min(1, horizon),
                z: position.z + velocity.z * horizon * this.velocityWeight + direction.z * this.directionWeight * Math.min(1, horizon),
                probability: 1 / (1 + horizon),
                source: "motion"
            });
        }
        intents = intents || [];
        for (var intent = 0; intent < intents.length; intent++) {
            var value = intents[intent];
            if (!value || !value.position) continue;
            this.points.push({
                x: value.position.x,
                y: value.position.y,
                z: value.position.z,
                probability: Math.max(0, Math.min(1, (value.weight === undefined ? 1 : value.weight) * this.intentWeight)),
                source: value.type || "intent"
            });
        }
        return this.points;
    }
}

class WorldCell {
    constructor(specification) {
        specification = specification || {};
        this.id = specification.id;
        this.bounds = specification.bounds;
        var minimum = specification.bounds.min;
        var maximum = specification.bounds.max;
        this.center = specification.center || {
            x: ((minimum.x === undefined ? minimum[0] : minimum.x) + (maximum.x === undefined ? maximum[0] : maximum.x)) * .5,
            y: ((minimum.y === undefined ? minimum[1] : minimum.y) + (maximum.y === undefined ? maximum[1] : maximum.y)) * .5,
            z: ((minimum.z === undefined ? minimum[2] : minimum.z) + (maximum.z === undefined ? maximum[2] : maximum.z)) * .5
        };
        this.importance = specification.importance === undefined ? 1 : specification.importance;
        this.layers = new Map;
        this.lastRequired = -1;
        this.priority = 0;
        this.metadata = specification.metadata || Object.create(null);
        var layers = specification.layers || {};
        var names = Object.keys(layers).sort();
        for (var index = 0; index < names.length; index++) {
            var source = layers[names[index]] || {};
            this.layers.set(names[index], {
                name: names[index],
                load: typeof source.load === "function" ? source.load : null,
                unload: typeof source.unload === "function" ? source.unload : null,
                bytes: source.bytes || 0,
                radius: source.radius === undefined ? Infinity : source.radius,
                state: source.resident ? "resident" : "idle",
                handle: source.handle || null,
                promise: null,
                error: null,
                generation: 0
            });
        }
    }
}

class WorldPartition {
    constructor(options) {
        options = options || {};
        this.spatial = options.spatial || new UnifiedSpatialDatabase({ cellSizes: options.cellSizes || [ 128, 512, 2048, 8192 ] });
        this.predictor = options.predictor || new PredictiveStreamer(options);
        this.residency = options.residency || null;
        this.cells = new Map;
        this.frame = 0;
        this.radius = options.radius || 512;
        this.unloadDelay = options.unloadDelay || 120;
        this.maxConcurrent = Math.max(1, options.maxConcurrent || 4);
        this.inflight = 0;
        this.queue = [];
        this.required = new Set;
        this.scratch = [];
        this.stats = { registered: 0, loaded: 0, unloaded: 0, failed: 0, queued: 0, predictions: 0, transitions: 0 };
    }
    register(specification) {
        if (!specification || specification.id === undefined) throw new Error("WorldPartition.register requires an id");
        if (this.cells.has(specification.id)) throw new Error("WorldPartition duplicate cell " + specification.id);
        if (!specification.bounds) throw new Error("WorldPartition cell requires bounds");
        var cell = specification instanceof WorldCell ? specification : new WorldCell(specification);
        this.cells.set(cell.id, cell);
        this.spatial.insert(cell.id, cell.bounds, { type: "world-cell", importance: cell.importance, data: cell });
        if (this.residency) {
            var iterator = cell.layers.values();
            for (var next = iterator.next(); !next.done; next = iterator.next()) {
                var layer = next.value;
                this.residency.register(cell.id + ":" + layer.name, { category: layer.name, bytes: layer.bytes, importance: cell.importance, load: layer.load, unload: layer.unload, resident: layer.state === "resident", handle: layer.handle });
            }
        }
        this.stats.registered++;
        return cell;
    }
    unregister(id) {
        var cell = this.cells.get(id);
        if (!cell) return false;
        var iterator = cell.layers.values();
        for (var next = iterator.next(); !next.done; next = iterator.next()) {
            var layer = next.value;
            if (layer.state === "resident") this.unload(cell, layer, "unregister");
            if (this.residency) this.residency.unregister(cell.id + ":" + layer.name);
        }
        this.spatial.remove(id);
        this.cells.delete(id);
        return true;
    }
    distance(cell, point) {
        var dx = cell.center.x - point.x, dy = cell.center.y - point.y, dz = cell.center.z - point.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    update(position, velocity, direction, intents) {
        this.frame++;
        this.required.clear();
        var points = this.predictor.predict(position, velocity, direction, intents);
        this.stats.predictions += points.length;
        for (var pointindex = 0; pointindex < points.length; pointindex++) {
            var point = points[pointindex];
            var ids = this.spatial.querySphere(point, this.radius, { type: "world-cell" }, this.scratch);
            for (var idindex = 0; idindex < ids.length; idindex++) {
                var cell = this.cells.get(ids[idindex]);
                if (!cell) continue;
                var distance = this.distance(cell, point);
                var priority = point.probability * cell.importance / Math.max(1, distance);
                if (!this.required.has(cell.id) || priority > cell.priority) cell.priority = priority;
                cell.lastRequired = this.frame;
                this.required.add(cell.id);
                this.require(cell, distance, point.probability);
            }
        }
        var iterator = this.cells.values();
        for (var next = iterator.next(); !next.done; next = iterator.next()) {
            var cell = next.value;
            if (this.required.has(cell.id) || this.frame - cell.lastRequired <= this.unloadDelay) continue;
            var layers = cell.layers.values();
            for (var layernext = layers.next(); !layernext.done; layernext = layers.next()) if (layernext.value.state === "resident") this.unload(cell, layernext.value, "distance");
        }
        this.sortqueue();
        this.pump();
        return this;
    }
    require(cell, distance, probability) {
        var iterator = cell.layers.values();
        for (var next = iterator.next(); !next.done; next = iterator.next()) {
            var layer = next.value;
            if (distance > layer.radius || layer.state === "resident" || layer.state === "loading" || layer.state === "queued") continue;
            layer.state = "queued";
            this.queue.push({ cell: cell, layer: layer, priority: cell.priority * probability / Math.max(1, layer.bytes / 1048576) });
            this.stats.queued++;
        }
    }
    sortqueue() {
        this.queue.sort(function(a, b) { return b.priority - a.priority || (String(a.cell.id) < String(b.cell.id) ? -1 : 1); });
    }
    pump() {
        while (this.inflight < this.maxConcurrent && this.queue.length) {
            var entry = this.queue.shift();
            if (entry.layer.state !== "queued") continue;
            this.load(entry.cell, entry.layer);
        }
        return this;
    }
    load(cell, layer) {
        layer.state = "loading";
        layer.generation++;
        var generation = layer.generation;
        this.inflight++;
        var self = this;
        var loading = this.residency ? this.residency.makeResident(cell.id + ":" + layer.name, { cell: cell, layer: layer }) : Promise.resolve(layer.load ? layer.load(cell, layer) : layer.handle);
        layer.promise = loading.then(function(handle) {
            self.inflight--;
            if (layer.generation !== generation) return null;
            layer.handle = handle;
            layer.state = "resident";
            layer.promise = null;
            layer.error = null;
            self.stats.loaded++;
            self.stats.transitions++;
            self.pump();
            return handle;
        }).catch(function(error) {
            self.inflight--;
            layer.state = "failed";
            layer.promise = null;
            layer.error = error;
            self.stats.failed++;
            self.pump();
            return null;
        });
        return layer.promise;
    }
    unload(cell, layer, reason) {
        layer.generation++;
        if (layer.state === "queued") {
            layer.state = "idle";
            return true;
        }
        if (layer.state !== "resident") return false;
        if (this.residency) this.residency.evict(cell.id + ":" + layer.name, reason || "unload");
        else if (layer.unload) layer.unload(layer.handle, reason || "unload", cell, layer);
        layer.handle = null;
        layer.state = "idle";
        this.stats.unloaded++;
        this.stats.transitions++;
        return true;
    }
    async flush() {
        while (this.inflight || this.queue.length) {
            this.pump();
            var promises = [];
            var iterator = this.cells.values();
            for (var next = iterator.next(); !next.done; next = iterator.next()) {
                var layers = next.value.layers.values();
                for (var layer = layers.next(); !layer.done; layer = layers.next()) if (layer.value.promise) promises.push(layer.value.promise);
            }
            if (!promises.length) break;
            await Promise.all(promises);
        }
        return this;
    }
    cell(id) {
        return this.cells.get(id) || null;
    }
    report() {
        var states = Object.create(null);
        var bytes = 0;
        this.cells.forEach(function(cell) {
            cell.layers.forEach(function(layer) {
                states[layer.state] = (states[layer.state] || 0) + 1;
                if (layer.state === "resident") bytes += layer.bytes;
            });
        });
        return { frame: this.frame, cells: this.cells.size, required: this.required.size, queued: this.queue.length, inflight: this.inflight, residentBytes: bytes, states: states, stats: Object.assign({}, this.stats) };
    }
}

export { PredictiveStreamer, WorldCell, WorldPartition };
