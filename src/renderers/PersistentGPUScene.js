class PersistentGPUScene {
    constructor(device, options) {
        options = options || {};
        this.device = device || null;
        this.capacity = Math.max(16, options.capacity || 1024);
        this.count = 0;
        this.aliveCount = 0;
        this.nextid = 1;
        this.free = [];
        this.generations = new Uint32Array(this.capacity);
        this.alive = new Uint8Array(this.capacity);
        this.transforms = new Float32Array(this.capacity * 16);
        this.previousTransforms = new Float32Array(this.capacity * 16);
        this.bounds = new Float32Array(this.capacity * 4);
        this.metadata = new Uint32Array(this.capacity * 8);
        this.importance = new Float32Array(this.capacity);
        this.gpubuffers = Object.create(null);
        this.dirty = Object.create(null);
        this.visibility = new Uint32Array(this.capacity);
        this.visibilityframe = 0;
        this.stats = {
            created: 0,
            removed: 0,
            uploads: 0,
            uploadedBytes: 0,
            resizes: 0,
            visible: 0,
            candidates: 0
        };
        this.markall();
    }
    usage() {
        var usage = typeof GPUBufferUsage !== "undefined" ? GPUBufferUsage : null;
        return usage ? usage.STORAGE | usage.COPY_DST | usage.COPY_SRC : 140;
    }
    identity(target, offset) {
        for (var index = 0; index < 16; index++) target[offset + index] = index % 5 === 0 ? 1 : 0;
    }
    ensure(id) {
        if (id < this.capacity) return;
        var capacity = this.capacity;
        while (capacity <= id) capacity *= 2;
        var copy = function(Type, source, length) {
            var value = new Type(length);
            value.set(source);
            return value;
        };
        this.generations = copy(Uint32Array, this.generations, capacity);
        this.alive = copy(Uint8Array, this.alive, capacity);
        this.transforms = copy(Float32Array, this.transforms, capacity * 16);
        this.previousTransforms = copy(Float32Array, this.previousTransforms, capacity * 16);
        this.bounds = copy(Float32Array, this.bounds, capacity * 4);
        this.metadata = copy(Uint32Array, this.metadata, capacity * 8);
        this.importance = copy(Float32Array, this.importance, capacity);
        this.visibility = copy(Uint32Array, this.visibility, capacity);
        this.capacity = capacity;
        this.destroybuffers();
        this.markall();
        this.stats.resizes++;
    }
    create(values) {
        values = values || {};
        var id = this.free.length ? this.free.pop() : this.nextid++;
        this.ensure(id);
        this.generations[id]++;
        this.alive[id] = 1;
        this.count = Math.max(this.count, id + 1);
        this.aliveCount++;
        var offset = id * 16;
        this.identity(this.transforms, offset);
        this.identity(this.previousTransforms, offset);
        this.bounds[id * 4 + 3] = 1;
        this.importance[id] = values.importance === undefined ? 1 : values.importance;
        this.metadata[id * 8 + 4] = values.flags || 0;
        this.metadata[id * 8 + 5] = values.cell || 0;
        this.metadata[id * 8 + 6] = values.lod || 0;
        if (values.transform) this.setTransform(id, values.transform, true);
        if (values.bounds) this.setBounds(id, values.bounds);
        this.setResources(id, values.geometry || 0, values.material || 0, values.texture || 0, values.animation || 0);
        this.mark("importance", id, id + 1);
        this.stats.created++;
        return id;
    }
    valid(id, generation) {
        return id > 0 && id < this.capacity && this.alive[id] === 1 && (generation === undefined || this.generations[id] === generation);
    }
    handle(id) {
        if (!this.valid(id)) return null;
        return { id: id, generation: this.generations[id] };
    }
    remove(id) {
        if (!this.valid(id)) return false;
        this.alive[id] = 0;
        this.metadata[id * 8 + 4] = 0;
        this.free.push(id);
        this.aliveCount--;
        this.mark("metadata", id, id + 1);
        this.mark("alive", id, id + 1);
        this.stats.removed++;
        return true;
    }
    setTransform(id, matrix, initialize) {
        if (!this.valid(id)) throw new Error("PersistentGPUScene invalid object " + id);
        var offset = id * 16;
        if (!initialize) this.previousTransforms.set(this.transforms.subarray(offset, offset + 16), offset);
        var source = matrix.elements || matrix;
        for (var index = 0; index < 16; index++) this.transforms[offset + index] = source[index];
        if (initialize) this.previousTransforms.set(this.transforms.subarray(offset, offset + 16), offset);
        this.mark("transforms", id, id + 1);
        this.mark("previousTransforms", id, id + 1);
        return this;
    }
    setBounds(id, bounds) {
        if (!this.valid(id)) throw new Error("PersistentGPUScene invalid object " + id);
        var offset = id * 4;
        var source = bounds.center ? [ bounds.center.x, bounds.center.y, bounds.center.z, bounds.radius ] : bounds;
        for (var index = 0; index < 4; index++) this.bounds[offset + index] = source[index] || 0;
        this.mark("bounds", id, id + 1);
        return this;
    }
    setResources(id, geometry, material, texture, animation) {
        if (!this.valid(id)) throw new Error("PersistentGPUScene invalid object " + id);
        var offset = id * 8;
        this.metadata[offset] = geometry >>> 0;
        this.metadata[offset + 1] = material >>> 0;
        this.metadata[offset + 2] = texture >>> 0;
        this.metadata[offset + 3] = animation >>> 0;
        this.mark("metadata", id, id + 1);
        return this;
    }
    setFlags(id, flags, cell, lod) {
        if (!this.valid(id)) throw new Error("PersistentGPUScene invalid object " + id);
        var offset = id * 8;
        this.metadata[offset + 4] = flags >>> 0;
        if (cell !== undefined) this.metadata[offset + 5] = cell >>> 0;
        if (lod !== undefined) this.metadata[offset + 6] = lod >>> 0;
        this.mark("metadata", id, id + 1);
        return this;
    }
    setImportance(id, value) {
        if (!this.valid(id)) throw new Error("PersistentGPUScene invalid object " + id);
        this.importance[id] = value;
        this.mark("importance", id, id + 1);
        return this;
    }
    mark(name, start, end) {
        var dirty = this.dirty[name];
        if (!dirty) this.dirty[name] = { start: start, end: end };
        else {
            if (start < dirty.start) dirty.start = start;
            if (end > dirty.end) dirty.end = end;
        }
        return this;
    }
    markall() {
        this.mark("transforms", 0, this.capacity);
        this.mark("previousTransforms", 0, this.capacity);
        this.mark("bounds", 0, this.capacity);
        this.mark("metadata", 0, this.capacity);
        this.mark("importance", 0, this.capacity);
        this.mark("alive", 0, this.capacity);
        return this;
    }
    array(name) {
        if (name === "alive") return this.alive;
        return this[name];
    }
    stride(name) {
        if (name === "transforms" || name === "previousTransforms") return 16;
        if (name === "bounds") return 4;
        if (name === "metadata") return 8;
        return 1;
    }
    ensurebuffers() {
        if (!this.device || !this.device.createBuffer) return this;
        var names = [ "transforms", "previousTransforms", "bounds", "metadata", "importance", "alive" ];
        for (var index = 0; index < names.length; index++) {
            var name = names[index];
            var array = this.array(name);
            if (!this.gpubuffers[name] || this.gpubuffers[name].size < Math.max(4, array.byteLength)) {
                if (this.gpubuffers[name] && this.gpubuffers[name].destroy) this.gpubuffers[name].destroy();
                this.gpubuffers[name] = this.device.createBuffer({ size: Math.max(4, array.byteLength + 3 & ~3), usage: this.usage() });
                this.mark(name, 0, this.capacity);
            }
        }
        return this;
    }
    upload() {
        if (!this.device || !this.device.queue || !this.device.queue.writeBuffer) return 0;
        this.ensurebuffers();
        var names = Object.keys(this.dirty);
        var bytes = 0;
        for (var index = 0; index < names.length; index++) {
            var name = names[index];
            var dirty = this.dirty[name];
            var array = this.array(name);
            var stride = this.stride(name);
            var start = dirty.start * stride;
            var end = Math.min(array.length, dirty.end * stride);
            if (end <= start) continue;
            var view = array.subarray(start, end);
            this.device.queue.writeBuffer(this.gpubuffers[name], start * array.BYTES_PER_ELEMENT, view);
            bytes += view.byteLength;
        }
        this.dirty = Object.create(null);
        this.stats.uploads++;
        this.stats.uploadedBytes += bytes;
        return bytes;
    }
    applyVisibility(ids, frame) {
        frame = frame === undefined ? ++this.visibilityframe : frame;
        this.visibilityframe = frame;
        for (var index = 0; index < ids.length; index++) if (this.valid(ids[index])) this.visibility[ids[index]] = frame;
        this.stats.visible = ids.length;
        this.stats.candidates = this.aliveCount;
        return this;
    }
    visibleRecently(id, frames) {
        return this.valid(id) && this.visibilityframe - this.visibility[id] <= (frames || 1);
    }
    report() {
        var cpu = this.generations.byteLength + this.alive.byteLength + this.transforms.byteLength + this.previousTransforms.byteLength + this.bounds.byteLength + this.metadata.byteLength + this.importance.byteLength + this.visibility.byteLength;
        return {
            capacity: this.capacity,
            count: this.count,
            alive: this.aliveCount,
            free: this.free.length,
            cpuBytes: cpu,
            gpuBytes: Object.keys(this.gpubuffers).reduce((total, name) => total + (this.gpubuffers[name].size || 0), 0),
            stats: Object.assign({}, this.stats)
        };
    }
    destroybuffers() {
        var names = Object.keys(this.gpubuffers);
        for (var index = 0; index < names.length; index++) if (this.gpubuffers[names[index]] && this.gpubuffers[names[index]].destroy) this.gpubuffers[names[index]].destroy();
        this.gpubuffers = Object.create(null);
        return this;
    }
    dispose() {
        this.destroybuffers();
        this.free.length = 0;
        this.count = 0;
        this.aliveCount = 0;
        return this;
    }
}

export { PersistentGPUScene };
