class UnifiedSpatialDatabase {
    constructor(options) {
        options = options || {};
        this.cellSizes = (options.cellSizes || [ 32, 128, 512, 2048 ]).slice().sort(function(a, b) { return a - b; });
        this.records = new Map;
        this.buckets = new Map;
        this.queryid = 0;
        this.stats = { inserted: 0, updated: 0, removed: 0, queries: 0, candidates: 0, hits: 0, bucketLinks: 0 };
    }
    bounds(value) {
        if (value.min && value.max) return {
            minx: value.min.x === undefined ? value.min[0] : value.min.x,
            miny: value.min.y === undefined ? value.min[1] : value.min.y,
            minz: value.min.z === undefined ? value.min[2] : value.min.z,
            maxx: value.max.x === undefined ? value.max[0] : value.max.x,
            maxy: value.max.y === undefined ? value.max[1] : value.max.y,
            maxz: value.max.z === undefined ? value.max[2] : value.max.z
        };
        if (value.center && value.radius !== undefined) {
            var x = value.center.x === undefined ? value.center[0] : value.center.x;
            var y = value.center.y === undefined ? value.center[1] : value.center.y;
            var z = value.center.z === undefined ? value.center[2] : value.center.z;
            return { minx: x - value.radius, miny: y - value.radius, minz: z - value.radius, maxx: x + value.radius, maxy: y + value.radius, maxz: z + value.radius };
        }
        var px = value.x || 0, py = value.y || 0, pz = value.z || 0;
        var rx = value.radius || 0;
        return { minx: px - rx, miny: py - rx, minz: pz - rx, maxx: px + rx, maxy: py + rx, maxz: pz + rx };
    }
    level(bounds) {
        var diameter = Math.max(bounds.maxx - bounds.minx, bounds.maxy - bounds.miny, bounds.maxz - bounds.minz);
        for (var index = 0; index < this.cellSizes.length - 1; index++) if (diameter <= this.cellSizes[index] * .75) return index;
        return this.cellSizes.length - 1;
    }
    key(level, x, y, z) {
        return level + ":" + x + ":" + y + ":" + z;
    }
    keys(bounds, level) {
        var size = this.cellSizes[level];
        var minx = Math.floor(bounds.minx / size), miny = Math.floor(bounds.miny / size), minz = Math.floor(bounds.minz / size);
        var maxx = Math.floor(bounds.maxx / size), maxy = Math.floor(bounds.maxy / size), maxz = Math.floor(bounds.maxz / size);
        var keys = [];
        for (var z = minz; z <= maxz; z++) for (var y = miny; y <= maxy; y++) for (var x = minx; x <= maxx; x++) keys.push(this.key(level, x, y, z));
        return keys;
    }
    link(record) {
        record.keys = this.keys(record.bounds, record.level);
        for (var index = 0; index < record.keys.length; index++) {
            var key = record.keys[index];
            var bucket = this.buckets.get(key);
            if (!bucket) {
                bucket = new Set;
                this.buckets.set(key, bucket);
            }
            bucket.add(record.id);
            this.stats.bucketLinks++;
        }
    }
    unlink(record) {
        for (var index = 0; index < record.keys.length; index++) {
            var key = record.keys[index];
            var bucket = this.buckets.get(key);
            if (!bucket) continue;
            if (bucket.delete(record.id)) this.stats.bucketLinks--;
            if (!bucket.size) this.buckets.delete(key);
        }
        record.keys.length = 0;
    }
    insert(id, bounds, options) {
        if (this.records.has(id)) throw new Error("UnifiedSpatialDatabase duplicate id " + id);
        options = options || {};
        var normalized = this.bounds(bounds);
        var record = {
            id: id,
            bounds: normalized,
            level: options.level === undefined ? this.level(normalized) : options.level,
            mask: options.mask === undefined ? 4294967295 : options.mask >>> 0,
            type: options.type || "object",
            importance: options.importance === undefined ? 1 : options.importance,
            data: options.data === undefined ? null : options.data,
            keys: [],
            queryid: 0
        };
        this.records.set(id, record);
        this.link(record);
        this.stats.inserted++;
        return this;
    }
    update(id, bounds, options) {
        var record = this.records.get(id);
        if (!record) throw new Error("UnifiedSpatialDatabase unknown id " + id);
        this.unlink(record);
        record.bounds = this.bounds(bounds);
        record.level = options && options.level !== undefined ? options.level : this.level(record.bounds);
        if (options) {
            if (options.mask !== undefined) record.mask = options.mask >>> 0;
            if (options.type !== undefined) record.type = options.type;
            if (options.importance !== undefined) record.importance = options.importance;
            if (options.data !== undefined) record.data = options.data;
        }
        this.link(record);
        this.stats.updated++;
        return this;
    }
    remove(id) {
        var record = this.records.get(id);
        if (!record) return false;
        this.unlink(record);
        this.records.delete(id);
        this.stats.removed++;
        return true;
    }
    intersects(a, b) {
        return a.minx <= b.maxx && a.maxx >= b.minx && a.miny <= b.maxy && a.maxy >= b.miny && a.minz <= b.maxz && a.maxz >= b.minz;
    }
    queryAABB(bounds, options, target) {
        options = options || {};
        target = target || [];
        target.length = 0;
        var query = this.bounds(bounds);
        var mask = options.mask === undefined ? 4294967295 : options.mask >>> 0;
        var type = options.type;
        var queryid = ++this.queryid;
        this.stats.queries++;
        for (var level = 0; level < this.cellSizes.length; level++) {
            var keys = this.keys(query, level);
            for (var keyindex = 0; keyindex < keys.length; keyindex++) {
                var bucket = this.buckets.get(keys[keyindex]);
                if (!bucket) continue;
                var iterator = bucket.values();
                for (var next = iterator.next(); !next.done; next = iterator.next()) {
                    var record = this.records.get(next.value);
                    if (!record || record.queryid === queryid) continue;
                    record.queryid = queryid;
                    this.stats.candidates++;
                    if (!(record.mask & mask) || type && record.type !== type || !this.intersects(record.bounds, query)) continue;
                    target.push(options.records ? record : record.id);
                }
            }
        }
        this.stats.hits += target.length;
        return target;
    }
    querySphere(center, radius, options, target) {
        var x = center.x === undefined ? center[0] : center.x;
        var y = center.y === undefined ? center[1] : center.y;
        var z = center.z === undefined ? center[2] : center.z;
        options = options || {};
        var records = this.queryAABB({ min: [ x - radius, y - radius, z - radius ], max: [ x + radius, y + radius, z + radius ] }, Object.assign({}, options, { records: true }), target || []);
        var write = 0;
        var radius2 = radius * radius;
        for (var index = 0; index < records.length; index++) {
            var record = records[index];
            var bounds = record.bounds;
            var px = Math.max(bounds.minx, Math.min(x, bounds.maxx));
            var py = Math.max(bounds.miny, Math.min(y, bounds.maxy));
            var pz = Math.max(bounds.minz, Math.min(z, bounds.maxz));
            var dx = px - x, dy = py - y, dz = pz - z;
            if (dx * dx + dy * dy + dz * dz <= radius2) records[write++] = options.records ? record : record.id;
        }
        this.stats.hits -= records.length - write;
        records.length = write;
        return records;
    }
    queryRay(origin, direction, distance, options, target) {
        options = options || {};
        distance = distance === undefined ? Infinity : distance;
        var ox = origin.x === undefined ? origin[0] : origin.x;
        var oy = origin.y === undefined ? origin[1] : origin.y;
        var oz = origin.z === undefined ? origin[2] : origin.z;
        var dx = direction.x === undefined ? direction[0] : direction.x;
        var dy = direction.y === undefined ? direction[1] : direction.y;
        var dz = direction.z === undefined ? direction[2] : direction.z;
        var end = isFinite(distance) ? [ ox + dx * distance, oy + dy * distance, oz + dz * distance ] : [ ox + dx * this.cellSizes[this.cellSizes.length - 1] * 8, oy + dy * this.cellSizes[this.cellSizes.length - 1] * 8, oz + dz * this.cellSizes[this.cellSizes.length - 1] * 8 ];
        var candidates = this.queryAABB({ min: [ Math.min(ox, end[0]), Math.min(oy, end[1]), Math.min(oz, end[2]) ], max: [ Math.max(ox, end[0]), Math.max(oy, end[1]), Math.max(oz, end[2]) ] }, Object.assign({}, options, { records: true }), target || []);
        var hits = [];
        for (var index = 0; index < candidates.length; index++) {
            var record = candidates[index];
            var bounds = record.bounds;
            var tmin = 0, tmax = distance;
            var origins = [ ox, oy, oz ], directions = [ dx, dy, dz ], minimums = [ bounds.minx, bounds.miny, bounds.minz ], maximums = [ bounds.maxx, bounds.maxy, bounds.maxz ];
            var valid = true;
            for (var axis = 0; axis < 3; axis++) {
                if (Math.abs(directions[axis]) < 1e-12) {
                    if (origins[axis] < minimums[axis] || origins[axis] > maximums[axis]) valid = false;
                    continue;
                }
                var inverse = 1 / directions[axis];
                var first = (minimums[axis] - origins[axis]) * inverse;
                var second = (maximums[axis] - origins[axis]) * inverse;
                if (first > second) { var swap = first; first = second; second = swap; }
                tmin = Math.max(tmin, first);
                tmax = Math.min(tmax, second);
                if (tmax < tmin) valid = false;
            }
            if (valid) hits.push({ id: record.id, distance: tmin, record: options.records ? record : undefined });
        }
        this.stats.hits -= candidates.length - hits.length;
        hits.sort(function(a, b) { return a.distance - b.distance; });
        return hits;
    }
    get(id) {
        return this.records.get(id) || null;
    }
    clear() {
        this.records.clear();
        this.buckets.clear();
        this.stats.bucketLinks = 0;
        return this;
    }
    report() {
        return { records: this.records.size, buckets: this.buckets.size, cellSizes: this.cellSizes.slice(), stats: Object.assign({}, this.stats) };
    }
}

export { UnifiedSpatialDatabase };
