class GeometryPageCodec {
    static attribute(geometry, name) {
        var attribute = geometry && geometry.attributes && geometry.attributes[name] || geometry && geometry[name];
        if (!attribute) return null;
        return attribute.array || attribute;
    }
    static encodeNormal(x, y, z, target, offset) {
        var length = Math.abs(x) + Math.abs(y) + Math.abs(z) || 1;
        x /= length;
        y /= length;
        z /= length;
        if (z < 0) {
            var oldx = x;
            x = (1 - Math.abs(y)) * (oldx < 0 ? -1 : 1);
            y = (1 - Math.abs(oldx)) * (y < 0 ? -1 : 1);
        }
        target[offset] = Math.round(Math.max(-1, Math.min(1, x)) * 32767);
        target[offset + 1] = Math.round(Math.max(-1, Math.min(1, y)) * 32767);
    }
    static decodeNormal(x, y, target, offset) {
        x /= 32767;
        y /= 32767;
        var z = 1 - Math.abs(x) - Math.abs(y);
        if (z < 0) {
            var oldx = x;
            x = (1 - Math.abs(y)) * (oldx < 0 ? -1 : 1);
            y = (1 - Math.abs(oldx)) * (y < 0 ? -1 : 1);
        }
        var length = Math.sqrt(x * x + y * y + z * z) || 1;
        target[offset] = x / length;
        target[offset + 1] = y / length;
        target[offset + 2] = z / length;
    }
    static encode(geometry) {
        var positions = GeometryPageCodec.attribute(geometry, "position");
        if (!positions || positions.length % 3) throw new Error("GeometryPageCodec requires position triples");
        var normals = GeometryPageCodec.attribute(geometry, "normal");
        var uvs = GeometryPageCodec.attribute(geometry, "uv");
        var indexsource = geometry && geometry.index && (geometry.index.array || geometry.index) || null;
        var vertexcount = positions.length / 3;
        var indexcount = indexsource ? indexsource.length : vertexcount;
        var index32 = vertexcount > 65535;
        var flags = (normals ? 1 : 0) | (uvs ? 2 : 0) | (index32 ? 4 : 0);
        var minx = Infinity, miny = Infinity, minz = Infinity, maxx = -Infinity, maxy = -Infinity, maxz = -Infinity;
        for (var vertex = 0; vertex < vertexcount; vertex++) {
            var x = positions[vertex * 3], y = positions[vertex * 3 + 1], z = positions[vertex * 3 + 2];
            if (x < minx) minx = x;
            if (y < miny) miny = y;
            if (z < minz) minz = z;
            if (x > maxx) maxx = x;
            if (y > maxy) maxy = y;
            if (z > maxz) maxz = z;
        }
        var minu = Infinity, minv = Infinity, maxu = -Infinity, maxv = -Infinity;
        if (uvs) for (var uv = 0; uv < vertexcount; uv++) {
            var u = uvs[uv * 2], v = uvs[uv * 2 + 1];
            if (u < minu) minu = u;
            if (v < minv) minv = v;
            if (u > maxu) maxu = u;
            if (v > maxv) maxv = v;
        }
        if (!uvs) minu = minv = maxu = maxv = 0;
        var positionbytes = vertexcount * 6;
        var normalbytes = normals ? vertexcount * 4 : 0;
        var uvbytes = uvs ? vertexcount * 4 : 0;
        var dataend = 64 + positionbytes + normalbytes + uvbytes;
        var indexoffset = dataend + 3 & ~3;
        var indexbytes = indexcount * (index32 ? 4 : 2);
        var total = indexoffset + indexbytes;
        var buffer = new ArrayBuffer(total);
        var view = new DataView(buffer);
        view.setUint32(0, 1179141968, true);
        view.setUint32(4, 1, true);
        view.setUint32(8, vertexcount, true);
        view.setUint32(12, indexcount, true);
        view.setUint32(16, flags, true);
        view.setUint32(20, total, true);
        var bounds = [ minx, miny, minz, maxx, maxy, maxz ];
        for (var bound = 0; bound < 6; bound++) view.setFloat32(24 + bound * 4, bounds[bound], true);
        view.setFloat32(48, minu, true);
        view.setFloat32(52, minv, true);
        view.setFloat32(56, maxu, true);
        view.setFloat32(60, maxv, true);
        var quantized = new Uint16Array(buffer, 64, vertexcount * 3);
        var sx = maxx - minx || 1, sy = maxy - miny || 1, sz = maxz - minz || 1;
        for (var position = 0; position < vertexcount; position++) {
            quantized[position * 3] = Math.round((positions[position * 3] - minx) / sx * 65535);
            quantized[position * 3 + 1] = Math.round((positions[position * 3 + 1] - miny) / sy * 65535);
            quantized[position * 3 + 2] = Math.round((positions[position * 3 + 2] - minz) / sz * 65535);
        }
        var offset = 64 + positionbytes;
        if (normals) {
            var octahedral = new Int16Array(buffer, offset, vertexcount * 2);
            for (var normal = 0; normal < vertexcount; normal++) GeometryPageCodec.encodeNormal(normals[normal * 3], normals[normal * 3 + 1], normals[normal * 3 + 2], octahedral, normal * 2);
            offset += normalbytes;
        }
        if (uvs) {
            var quantizeduv = new Uint16Array(buffer, offset, vertexcount * 2);
            var su = maxu - minu || 1, sv = maxv - minv || 1;
            for (var uvindex = 0; uvindex < vertexcount; uvindex++) {
                quantizeduv[uvindex * 2] = Math.round((uvs[uvindex * 2] - minu) / su * 65535);
                quantizeduv[uvindex * 2 + 1] = Math.round((uvs[uvindex * 2 + 1] - minv) / sv * 65535);
            }
        }
        if (index32) {
            var indices32 = new Uint32Array(buffer, indexoffset, indexcount);
            for (var index = 0; index < indexcount; index++) indices32[index] = indexsource ? indexsource[index] : index;
        } else {
            var indices16 = new Uint16Array(buffer, indexoffset, indexcount);
            for (var smallindex = 0; smallindex < indexcount; smallindex++) indices16[smallindex] = indexsource ? indexsource[smallindex] : smallindex;
        }
        return { buffer: buffer, vertexCount: vertexcount, indexCount: indexcount, byteLength: total, flags: flags, bounds: bounds };
    }
    static decode(input) {
        var buffer = input.buffer instanceof ArrayBuffer && input.byteLength === undefined ? input.buffer : input instanceof ArrayBuffer ? input : input.buffer;
        var byteoffset = input.byteOffset || 0;
        if (byteoffset) buffer = buffer.slice(byteoffset, byteoffset + input.byteLength);
        var view = new DataView(buffer);
        if (view.getUint32(0, true) !== 1179141968) throw new Error("GeometryPageCodec invalid page");
        var vertexcount = view.getUint32(8, true);
        var indexcount = view.getUint32(12, true);
        var flags = view.getUint32(16, true);
        var minx = view.getFloat32(24, true), miny = view.getFloat32(28, true), minz = view.getFloat32(32, true);
        var maxx = view.getFloat32(36, true), maxy = view.getFloat32(40, true), maxz = view.getFloat32(44, true);
        var minu = view.getFloat32(48, true), minv = view.getFloat32(52, true), maxu = view.getFloat32(56, true), maxv = view.getFloat32(60, true);
        var positions = new Float32Array(vertexcount * 3);
        var quantized = new Uint16Array(buffer, 64, vertexcount * 3);
        var sx = maxx - minx, sy = maxy - miny, sz = maxz - minz;
        for (var position = 0; position < vertexcount; position++) {
            positions[position * 3] = minx + quantized[position * 3] / 65535 * sx;
            positions[position * 3 + 1] = miny + quantized[position * 3 + 1] / 65535 * sy;
            positions[position * 3 + 2] = minz + quantized[position * 3 + 2] / 65535 * sz;
        }
        var offset = 64 + vertexcount * 6;
        var normals = null;
        if (flags & 1) {
            normals = new Float32Array(vertexcount * 3);
            var octahedral = new Int16Array(buffer, offset, vertexcount * 2);
            for (var normal = 0; normal < vertexcount; normal++) GeometryPageCodec.decodeNormal(octahedral[normal * 2], octahedral[normal * 2 + 1], normals, normal * 3);
            offset += vertexcount * 4;
        }
        var uvs = null;
        if (flags & 2) {
            uvs = new Float32Array(vertexcount * 2);
            var quantizeduv = new Uint16Array(buffer, offset, vertexcount * 2);
            for (var uv = 0; uv < vertexcount; uv++) {
                uvs[uv * 2] = minu + quantizeduv[uv * 2] / 65535 * (maxu - minu);
                uvs[uv * 2 + 1] = minv + quantizeduv[uv * 2 + 1] / 65535 * (maxv - minv);
            }
            offset += vertexcount * 4;
        }
        var indexoffset = offset + 3 & ~3;
        var indices = flags & 4 ? new Uint32Array(buffer.slice(indexoffset, indexoffset + indexcount * 4)) : new Uint16Array(buffer.slice(indexoffset, indexoffset + indexcount * 2));
        return { attributes: { position: positions, normal: normals, uv: uvs }, index: indices, vertexCount: vertexcount, indexCount: indexcount, bounds: [ minx, miny, minz, maxx, maxy, maxz ], byteLength: buffer.byteLength };
    }
}

class RuntimeGeometryCache {
    constructor(options) {
        options = options || {};
        this.maxBytes = options.maxBytes || 128 * 1024 * 1024;
        this.entries = new Map;
        this.bytes = 0;
        this.frame = 0;
        this.stats = { hits: 0, misses: 0, generated: 0, evicted: 0, bytes: 0 };
    }
    hash(value) {
        var string = typeof value === "string" ? value : JSON.stringify(value);
        var hash = 2166136261;
        for (var index = 0; index < string.length; index++) {
            hash ^= string.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16).padStart(8, "0");
    }
    get(key) {
        var entry = this.entries.get(key);
        if (!entry) {
            this.stats.misses++;
            return null;
        }
        entry.lastUse = ++this.frame;
        this.stats.hits++;
        return entry.value;
    }
    set(key, value, bytes) {
        bytes = bytes === undefined ? value && (value.byteLength || value.buffer && value.buffer.byteLength) || 0 : bytes;
        var previous = this.entries.get(key);
        if (previous) this.bytes -= previous.bytes;
        this.entries.set(key, { value: value, bytes: bytes, lastUse: ++this.frame });
        this.bytes += bytes;
        this.stats.bytes = this.bytes;
        this.enforce();
        return value;
    }
    async getOrCreate(key, generator) {
        var existing = this.get(key);
        if (existing) return existing;
        var value = await generator(key);
        this.stats.generated++;
        return this.set(key, value);
    }
    enforce() {
        if (this.bytes <= this.maxBytes) return this;
        var entries = Array.from(this.entries.entries());
        entries.sort(function(a, b) { return a[1].lastUse - b[1].lastUse; });
        for (var index = 0; this.bytes > this.maxBytes && index < entries.length; index++) {
            this.entries.delete(entries[index][0]);
            this.bytes -= entries[index][1].bytes;
            this.stats.evicted++;
        }
        this.stats.bytes = this.bytes;
        return this;
    }
    clear() {
        this.entries.clear();
        this.bytes = 0;
        this.stats.bytes = 0;
        return this;
    }
    report() {
        return { entries: this.entries.size, bytes: this.bytes, maxBytes: this.maxBytes, stats: Object.assign({}, this.stats) };
    }
}

export { GeometryPageCodec, RuntimeGeometryCache };
