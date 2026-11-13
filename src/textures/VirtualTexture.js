import { faoxomvalue } from "../math/index.js";

class VirtualTexture {
    constructor(renderer, options) {
        options = options || {};
        this.type = options.type === "array" || options.type === "cube" ? options.type : "2d";
        this.renderer = renderer;
        if (!renderer || !renderer.device) throw new Error("VirtualTexture requires an initialized WebGPU renderer");
        var device = renderer.device;
        this.pageSize = faoxomvalue(options.pageSize, 128);
        if (this.pageSize < 32 || (this.pageSize & (this.pageSize - 1)) !== 0) throw new Error("pageSize must be a power of two >= 32");
        this.tiles = Math.max(1, Math.floor(faoxomvalue(options.tiles, 8)));
        if (this.tiles > 16) throw new Error("tiles must be <= 16 so page-table tile indices fit one byte");
        this.layers = this.type === "cube" ? 6 : Math.max(1, Math.floor(faoxomvalue(options.layers, this.type === "array" ? 2 : 1)));
        this.virtualSize = Math.floor(faoxomvalue(options.virtualSize, 2048));
        if (this.virtualSize < this.pageSize || (this.virtualSize & (this.virtualSize - 1)) !== 0) throw new Error("virtualSize must be a power of two >= pageSize");
        this.tableSize = this.virtualSize / this.pageSize;
        this.mipCount = Math.max(1, Math.round(Math.log2(this.tableSize)) + 1);
        this.maxMip = this.mipCount - 1;
        this.tileCount = this.tiles * this.tiles;
        this.format = faoxomvalue(options.format, "rgba8unorm");
        this.bytesPerPixel = this.format === "rgba8unorm" ? 4 : 4;
        this.pages = new Map();
        this.tileOwners = new Array(this.tileCount).fill(null);
        this.freeTiles = [];
        for (var t = this.tileCount - 1; t >= 0; t--) this.freeTiles.push(t);
        this.frame = 0;
        this.mipBases = [];
        var cumulative = 0;
        for (var m = 0; m < this.mipCount; m++) { this.mipBases.push(cumulative); cumulative += this.pageCount(m); }
        this.pagesPerLayer = cumulative;
        this.totalPages = this.pagesPerLayer * this.layers;
        this.tableData = [];
        for (var layer = 0; layer < this.layers; layer++) {
            var layerTables = [];
            for (var m2 = 0; m2 < this.mipCount; m2++) {
                var side = this.tableSide(m2);
                layerTables.push(new Uint8Array(side * side * 4));
            }
            this.tableData.push(layerTables);
        }
        this.atlasTexture = device.createTexture({ size: [this.pageSize * this.tiles, this.pageSize * this.tiles, 1], dimension: "2d", format: this.format, mipLevelCount: 1, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC });
        this.tableTexture = device.createTexture({ size: [this.tableSize, this.tableSize, this.layers], dimension: "2d", format: this.format, mipLevelCount: this.mipCount, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC });
        this.atlasView = this.atlasTexture.createView();
        this.tableView = this.tableTexture.createView({ dimension: "2d-array" });
        this.tableSampler = device.createSampler({ magFilter: "nearest", minFilter: "nearest", mipmapFilter: "nearest" });
        this.atlasSampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
        this.stats = { uploads: 0, evictions: 0, tableFlushes: 0 };
    }
    tableSide(mip) { return Math.max(1, this.tableSize >> Math.min(mip, this.maxMip)); }
    pageCount(mip) { var side = this.tableSide(mip); return side * side; }
    pageKey(mip, layer, px, py) { return layer + ":" + mip + ":" + px + ":" + py; }
    pageId(mip, layer, px, py) { var side = this.tableSide(mip); return (layer * this.pagesPerLayer + this.mipBases[mip]) + py * side + px; }
    pageFromId(id) { var layer = Math.floor(id / this.pagesPerLayer); var rest = id - layer * this.pagesPerLayer; var mip = 0; while (mip + 1 < this.mipCount && rest >= this.mipBases[mip + 1]) mip++; var side = this.tableSide(mip); var within = rest - this.mipBases[mip]; return { layer: layer, mip: mip, px: within % side, py: Math.floor(within / side) }; }
    isResident(mip, layer, px, py) { return this.pages.has(this.pageKey(mip, layer, px, py)); }
    allocateTile() { return this.freeTiles.length ? this.freeTiles.pop() : null; }
    setPage(mip, layer, px, py, tile) {
        mip = Math.min(mip, this.maxMip);
        var side = this.tableSide(mip);
        if (px < 0 || py < 0 || px >= side || py >= side || layer < 0 || layer >= this.layers) return null;
        var key = this.pageKey(mip, layer, px, py);
        var existing = this.pages.get(key);
        if (existing) this.releasePage(key, existing);
        var data = this.tableData[layer][mip];
        var index = (py * side + px) * 4;
        data[index] = tile & 255;
        data[index + 1] = 0;
        data[index + 2] = 0;
        data[index + 3] = 255;
        this.tileOwners[tile] = key;
        this.pages.set(key, { tile: tile, lastUsed: this.frame, pinned: existing ? existing.pinned : false });
        return key;
    }
    releasePage(key, entry) {
        if (!entry) entry = this.pages.get(key);
        if (!entry) return false;
        var parts = key.split(":");
        var data = this.tableData[Number(parts[0])][Number(parts[1])];
        var side = this.tableSide(Number(parts[1]));
        var index = (Number(parts[3]) * side + Number(parts[2])) * 4;
        data[index] = 0;
        data[index + 3] = 0;
        if (this.tileOwners[entry.tile] === key) this.tileOwners[entry.tile] = null;
        if (this.freeTiles.indexOf(entry.tile) === -1) this.freeTiles.push(entry.tile);
        this.pages.delete(key);
        return true;
    }
    touch(mip, layer, px, py) { var entry = this.pages.get(this.pageKey(mip, layer, px, py)); if (entry) entry.lastUsed = this.frame; return !!entry; }
    pinPage(mip, layer, px, py, pinned) { var entry = this.pages.get(this.pageKey(mip, layer, px, py)); if (entry) entry.pinned = pinned !== false; return !!entry; }
    evictLRU(count) {
        var candidates = [];
        this.pages.forEach(function(entry, key) { if (!entry.pinned) candidates.push({ key: key, entry: entry }); });
        candidates.sort(function(a, b) { return a.entry.lastUsed - b.entry.lastUsed; });
        var evicted = 0;
        for (var i = 0; i < candidates.length && evicted < count; i++) { this.releasePage(candidates[i].key, candidates[i].entry); evicted++; }
        this.stats.evictions += evicted;
        return evicted;
    }
    uploadTile(tile, rgbaBytes) {
        var expected = this.pageSize * this.pageSize * this.bytesPerPixel;
        var source = rgbaBytes;
        if (!source) return this;
        if (source instanceof ImageData) source = new Uint8Array(source.data.buffer ? source.data.buffer.slice(source.data.byteOffset, source.data.byteOffset + source.data.byteLength) : source.data);
        if (source.byteLength < expected) { var padded = new Uint8Array(expected); padded.set(new Uint8Array(source.buffer || source, source.byteOffset || 0, Math.min(source.byteLength || source.length, expected))); source = padded; }
        var rowBytes = this.pageSize * this.bytesPerPixel;
        var pitch = Math.ceil(rowBytes / 256) * 256;
        if (pitch === rowBytes) {
            this.renderer.device.queue.writeTexture({ texture: this.atlasTexture, origin: { x: (tile % this.tiles) * this.pageSize, y: Math.floor(tile / this.tiles) * this.pageSize, z: 0 } }, source, { bytesPerRow: rowBytes, rowsPerImage: this.pageSize }, [this.pageSize, this.pageSize, 1]);
        } else {
            var paddedRows = new Uint8Array(pitch * this.pageSize);
            var view = new Uint8Array(source.buffer || source, source.byteOffset || 0, expected);
            for (var row = 0; row < this.pageSize; row++) paddedRows.set(view.subarray(row * rowBytes, row * rowBytes + rowBytes), row * pitch);
            this.renderer.device.queue.writeTexture({ texture: this.atlasTexture, origin: { x: (tile % this.tiles) * this.pageSize, y: Math.floor(tile / this.tiles) * this.pageSize, z: 0 } }, paddedRows, { bytesPerRow: pitch, rowsPerImage: this.pageSize }, [this.pageSize, this.pageSize, 1]);
        }
        this.stats.uploads++;
        return this;
    }
    async readTile(tile) {
        var device = this.renderer.device;
        var rowBytes = this.pageSize * this.bytesPerPixel;
        var pitch = Math.ceil(rowBytes / 256) * 256;
        var buffer = device.createBuffer({ size: pitch * this.pageSize, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        var encoder = device.createCommandEncoder();
        encoder.copyTextureToBuffer({ texture: this.atlasTexture, origin: { x: (tile % this.tiles) * this.pageSize, y: Math.floor(tile / this.tiles) * this.pageSize, z: 0 } }, { buffer: buffer, bytesPerRow: pitch, rowsPerImage: this.pageSize }, [this.pageSize, this.pageSize, 1]);
        device.queue.submit([encoder.finish()]);
        await device.queue.onSubmittedWorkDone();
        await buffer.mapAsync(GPUMapMode.READ);
        var mapped = new Uint8Array(buffer.getMappedRange());
        var result = new Uint8Array(rowBytes * this.pageSize);
        for (var row = 0; row < this.pageSize; row++) result.set(mapped.subarray(row * pitch, row * pitch + rowBytes), row * rowBytes);
        buffer.unmap();
        buffer.destroy();
        return result;
    }
    async readTableTexel(mip, layer, px, py) {
        var device = this.renderer.device;
        var side = this.tableSide(mip);
        var buffer = device.createBuffer({ size: 256, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        var encoder = device.createCommandEncoder();
        encoder.copyTextureToBuffer({ texture: this.tableTexture, mipLevel: mip, origin: { x: px, y: py, z: layer } }, { buffer: buffer, bytesPerRow: 256, rowsPerImage: 1 }, [1, 1, 1]);
        device.queue.submit([encoder.finish()]);
        await device.queue.onSubmittedWorkDone();
        await buffer.mapAsync(GPUMapMode.READ);
        var mapped = new Uint8Array(buffer.getMappedRange()).slice();
        buffer.unmap();
        buffer.destroy();
        return [mapped[0], mapped[1], mapped[2], mapped[3]];
    }
    flushTable() {
        var device = this.renderer.device;
        for (var layer = 0; layer < this.layers; layer++) for (var mip = 0; mip < this.mipCount; mip++) {
            var side = this.tableSide(mip);
            var rowBytes = side * 4;
            var pitch = Math.ceil(rowBytes / 256) * 256;
            var data = this.tableData[layer][mip];
            if (pitch === rowBytes) {
                device.queue.writeTexture({ texture: this.tableTexture, mipLevel: mip, origin: { x: 0, y: 0, z: layer } }, data, { bytesPerRow: rowBytes, rowsPerImage: side }, [side, side, 1]);
            } else {
                var padded = new Uint8Array(pitch * side);
                for (var row = 0; row < side; row++) padded.set(data.subarray(row * rowBytes, row * rowBytes + rowBytes), row * pitch);
                device.queue.writeTexture({ texture: this.tableTexture, mipLevel: mip, origin: { x: 0, y: 0, z: layer } }, padded, { bytesPerRow: pitch, rowsPerImage: side }, [side, side, 1]);
            }
        }
        this.stats.tableFlushes++;
        return this;
    }
    advanceFrame() { this.frame++; return this; }
    sampleWGSL(prefix, tableView, tableSampler, atlasView, atlasSampler, fallback) {
        var tilesF = this.tiles.toFixed(1);
        var halfTexel = (0.5 / this.pageSize).toFixed(8);
        var maxMipF = this.maxMip.toFixed(1);
        var tableSizeF = this.tableSize.toFixed(1);
        var miss = fallback || "vec4<f32>(0.5, 0.5, 0.5, 1.0)";
        var p = prefix || "vt";
        return "fn " + p + "Page(uv: vec2<f32>, layer: f32, tableMip: f32) -> vec4<f32> { let m = clamp(floor(tableMip + 0.5), 0.0, " + maxMipF + "); let side = max(floor(" + tableSizeF + " / pow(2.0, m)), 1.0); let scaled = uv * vec2<f32>(side, side); let entry = textureSampleLevel(" + tableView + ", " + tableSampler + ", uv, i32(clamp(layer, 0.0, 255.0)), m); if (entry.a < 0.5) { return " + miss + "; } let tile = floor(entry.r * 255.0 + 0.5); let tilesF = " + tilesF + "; let tileX = tile - floor(tile / tilesF) * tilesF; let tileY = floor(tile / tilesF); var local = fract(scaled); local = clamp(local, vec2<f32>(" + halfTexel + "), vec2<f32>(1.0 - " + halfTexel + ")); let atlasUv = (vec2<f32>(tileX, tileY) + local) / vec2<f32>(tilesF, tilesF); return textureSampleLevel(" + atlasView + ", " + atlasSampler + ", atlasUv, 0.0); } fn " + p + "TableMip(uv: vec2<f32>, virtualSize: f32, pageSize: f32, maxMip: f32) -> f32 { let dx = abs(dpdx(uv).x); let dy = abs(dpdy(uv).y); let density = max(max(dx, dy) * virtualSize / pageSize, 0.000001); return clamp(floor(log2(density) + 0.5), 0.0, maxMip); }";
    }
    dispose() {
        if (this.atlasTexture) this.atlasTexture.destroy();
        if (this.tableTexture) this.tableTexture.destroy();
        this.atlasTexture = null;
        this.tableTexture = null;
        this.atlasView = null;
        this.tableView = null;
        this.pages.clear();
        return this;
    }
}

export { VirtualTexture };
