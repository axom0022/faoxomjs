class TextureHandleHeap {
    constructor(options) {
        options = options || {};
        this.pageSize = Math.max(4, options.pageSize || 64);
        this.maxPages = Math.max(1, options.maxPages || 16);
        this.entries = [ null ];
        this.lookup = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this.free = [];
        this.stats = { added: 0, removed: 0, reused: 0, pages: 0 };
    }
    add(texture, sampler) {
        if (texture && this.lookup) {
            var existing = this.lookup.get(texture);
            if (existing) return existing;
        }
        var handle = this.free.length ? this.free.pop() : this.entries.length;
        if (handle >= this.pageSize * this.maxPages) throw new Error("TextureHandleHeap capacity exceeded");
        this.entries[handle] = { texture: texture || null, sampler: sampler || null, generation: (this.entries[handle] && this.entries[handle].generation || 0) + 1 };
        if (texture && this.lookup) this.lookup.set(texture, handle);
        this.stats.added++;
        this.stats.pages = Math.ceil(this.entries.length / this.pageSize);
        return handle;
    }
    remove(handle) {
        var entry = this.entries[handle];
        if (!entry) return false;
        if (entry.texture && this.lookup) this.lookup.delete(entry.texture);
        this.entries[handle] = null;
        this.free.push(handle);
        this.stats.removed++;
        return true;
    }
    get(handle) {
        return this.entries[handle] || null;
    }
    page(handle) {
        return Math.floor(handle / this.pageSize);
    }
    slot(handle) {
        return handle % this.pageSize;
    }
    pages() {
        var result = [];
        var count = Math.ceil(this.entries.length / this.pageSize);
        for (var page = 0; page < count; page++) {
            var entries = new Array(this.pageSize);
            for (var slot = 0; slot < this.pageSize; slot++) entries[slot] = this.entries[page * this.pageSize + slot] || null;
            result.push(entries);
        }
        return result;
    }
}

class BindlessMaterialTable {
    constructor(device, options) {
        options = options || {};
        this.device = device || null;
        this.capacity = Math.max(16, options.capacity || 1024);
        this.floatStride = 32;
        this.uintStride = 16;
        this.floats = new Float32Array(this.capacity * this.floatStride);
        this.uints = new Uint32Array(this.capacity * this.uintStride);
        this.alive = new Uint8Array(this.capacity);
        this.free = [];
        this.nextid = 1;
        this.count = 0;
        this.textureHeap = options.textureHeap || new TextureHandleHeap(options);
        this.floatBuffer = null;
        this.uintBuffer = null;
        this.dirtyStart = Infinity;
        this.dirtyEnd = -1;
        this.stats = { created: 0, updated: 0, removed: 0, uploads: 0, uploadedBytes: 0, resizes: 0 };
    }
    usage() {
        var usage = typeof GPUBufferUsage !== "undefined" ? GPUBufferUsage : null;
        return usage ? usage.STORAGE | usage.COPY_DST | usage.COPY_SRC : 140;
    }
    ensure(id) {
        if (id < this.capacity) return;
        var capacity = this.capacity;
        while (capacity <= id) capacity *= 2;
        var floats = new Float32Array(capacity * this.floatStride);
        var uints = new Uint32Array(capacity * this.uintStride);
        var alive = new Uint8Array(capacity);
        floats.set(this.floats);
        uints.set(this.uints);
        alive.set(this.alive);
        this.floats = floats;
        this.uints = uints;
        this.alive = alive;
        this.capacity = capacity;
        this.destroybuffers();
        this.dirtyStart = 0;
        this.dirtyEnd = capacity;
        this.stats.resizes++;
    }
    create(material) {
        var id = this.free.length ? this.free.pop() : this.nextid++;
        this.ensure(id);
        this.alive[id] = 1;
        this.count++;
        this.write(id, material || {});
        this.stats.created++;
        return id;
    }
    texture(value, sampler) {
        if (typeof value === "number") return value;
        return value ? this.textureHeap.add(value, sampler) : 0;
    }
    write(id, material) {
        if (!this.alive[id]) throw new Error("BindlessMaterialTable invalid material " + id);
        var floatoffset = id * this.floatStride;
        var uintoffset = id * this.uintStride;
        var color = material.color || { r: 1, g: 1, b: 1 };
        var emissive = material.emissive || { r: 0, g: 0, b: 0 };
        this.floats[floatoffset] = color.r === undefined ? color[0] === undefined ? 1 : color[0] : color.r;
        this.floats[floatoffset + 1] = color.g === undefined ? color[1] === undefined ? 1 : color[1] : color.g;
        this.floats[floatoffset + 2] = color.b === undefined ? color[2] === undefined ? 1 : color[2] : color.b;
        this.floats[floatoffset + 3] = material.opacity === undefined ? 1 : material.opacity;
        this.floats[floatoffset + 4] = material.metalness || 0;
        this.floats[floatoffset + 5] = material.roughness === undefined ? .5 : material.roughness;
        this.floats[floatoffset + 6] = material.ior === undefined ? 1.5 : material.ior;
        this.floats[floatoffset + 7] = material.transmission || 0;
        this.floats[floatoffset + 8] = emissive.r === undefined ? emissive[0] || 0 : emissive.r;
        this.floats[floatoffset + 9] = emissive.g === undefined ? emissive[1] || 0 : emissive.g;
        this.floats[floatoffset + 10] = emissive.b === undefined ? emissive[2] || 0 : emissive.b;
        this.floats[floatoffset + 11] = material.emissiveIntensity === undefined ? 1 : material.emissiveIntensity;
        this.floats[floatoffset + 12] = material.clearcoat || 0;
        this.floats[floatoffset + 13] = material.clearcoatRoughness || 0;
        this.floats[floatoffset + 14] = material.sheen || 0;
        this.floats[floatoffset + 15] = material.iridescence || 0;
        this.floats[floatoffset + 16] = material.anisotropy || 0;
        this.floats[floatoffset + 17] = material.anisotropyRotation || 0;
        this.floats[floatoffset + 18] = material.alphaCutoff === undefined ? .5 : material.alphaCutoff;
        this.floats[floatoffset + 19] = material.normalScale === undefined ? 1 : material.normalScale.x === undefined ? material.normalScale : material.normalScale.x;
        this.uints[uintoffset] = this.texture(material.map || material.baseColorMap, material.sampler);
        this.uints[uintoffset + 1] = this.texture(material.normalMap || material.normalmap, material.sampler);
        this.uints[uintoffset + 2] = this.texture(material.roughnessMap || material.roughnessmap, material.sampler);
        this.uints[uintoffset + 3] = this.texture(material.metalnessMap || material.metalnessmap, material.sampler);
        this.uints[uintoffset + 4] = this.texture(material.aoMap || material.aomap, material.sampler);
        this.uints[uintoffset + 5] = this.texture(material.emissiveMap || material.emissivemap, material.sampler);
        this.uints[uintoffset + 6] = this.texture(material.envMap, material.sampler);
        this.uints[uintoffset + 7] = material.flags || 0;
        this.uints[uintoffset + 8] = material.kernel || 0;
        var page = 0;
        for (var index = 0; index < 7; index++) page = Math.max(page, this.textureHeap.page(this.uints[uintoffset + index]));
        this.uints[uintoffset + 9] = page;
        this.dirtyStart = Math.min(this.dirtyStart, id);
        this.dirtyEnd = Math.max(this.dirtyEnd, id + 1);
        this.stats.updated++;
        return this;
    }
    remove(id) {
        if (!this.alive[id]) return false;
        this.alive[id] = 0;
        this.count--;
        this.free.push(id);
        this.uints.fill(0, id * this.uintStride, (id + 1) * this.uintStride);
        this.floats.fill(0, id * this.floatStride, (id + 1) * this.floatStride);
        this.dirtyStart = Math.min(this.dirtyStart, id);
        this.dirtyEnd = Math.max(this.dirtyEnd, id + 1);
        this.stats.removed++;
        return true;
    }
    pageForMaterial(id) {
        return this.alive[id] ? this.uints[id * this.uintStride + 9] : -1;
    }
    groups(ids) {
        var groups = new Map;
        for (var index = 0; index < ids.length; index++) {
            var id = ids[index];
            if (!this.alive[id]) continue;
            var key = this.uints[id * this.uintStride + 8] + "|" + this.pageForMaterial(id);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(id);
        }
        return groups;
    }
    ensurebuffers() {
        if (!this.device || !this.device.createBuffer) return this;
        if (!this.floatBuffer || this.floatBuffer.size < this.floats.byteLength) {
            this.destroybuffers();
            this.floatBuffer = this.device.createBuffer({ size: this.floats.byteLength, usage: this.usage() });
            this.uintBuffer = this.device.createBuffer({ size: this.uints.byteLength, usage: this.usage() });
            this.dirtyStart = 0;
            this.dirtyEnd = this.capacity;
        }
        return this;
    }
    upload() {
        if (!this.device || !this.device.queue || !this.device.queue.writeBuffer || this.dirtyEnd <= this.dirtyStart) return 0;
        this.ensurebuffers();
        var floatstart = this.dirtyStart * this.floatStride;
        var floatend = this.dirtyEnd * this.floatStride;
        var uintstart = this.dirtyStart * this.uintStride;
        var uintend = this.dirtyEnd * this.uintStride;
        var floatview = this.floats.subarray(floatstart, floatend);
        var uintview = this.uints.subarray(uintstart, uintend);
        this.device.queue.writeBuffer(this.floatBuffer, floatstart * 4, floatview);
        this.device.queue.writeBuffer(this.uintBuffer, uintstart * 4, uintview);
        var bytes = floatview.byteLength + uintview.byteLength;
        this.dirtyStart = Infinity;
        this.dirtyEnd = -1;
        this.stats.uploads++;
        this.stats.uploadedBytes += bytes;
        return bytes;
    }
    report() {
        return {
            capacity: this.capacity,
            count: this.count,
            cpuBytes: this.floats.byteLength + this.uints.byteLength + this.alive.byteLength,
            textureHandles: this.textureHeap.entries.length - this.textureHeap.free.length - 1,
            texturePages: this.textureHeap.stats.pages,
            stats: Object.assign({}, this.stats)
        };
    }
    destroybuffers() {
        if (this.floatBuffer && this.floatBuffer.destroy) this.floatBuffer.destroy();
        if (this.uintBuffer && this.uintBuffer.destroy) this.uintBuffer.destroy();
        this.floatBuffer = null;
        this.uintBuffer = null;
        return this;
    }
    dispose() {
        this.destroybuffers();
        this.free.length = 0;
        this.count = 0;
        return this;
    }
}

export { BindlessMaterialTable, TextureHandleHeap };
