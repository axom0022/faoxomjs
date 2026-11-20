import { faoxomvalue } from "../math/index.js";

class VirtualTexture {
    constructor(zavka, zavkb) {
        zavkb = zavkb || {};
        this.type = zavkb.type === "array" || zavkb.type === "cube" ? zavkb.type : "2d";
        this.renderer = zavka;
        if (!zavka || !zavka.device) throw new Error("VirtualTexture requires an initialized WebGPU renderer");
        var zavkc = zavka.device;
        this.pageSize = faoxomvalue(zavkb.pageSize, 128);
        if (this.pageSize < 32 || (this.pageSize & this.pageSize - 1) !== 0) throw new Error("pageSize must be a power of two >= 32");
        this.tiles = Math.max(1, Math.floor(faoxomvalue(zavkb.tiles, 8)));
        if (this.tiles > 16) throw new Error("tiles must be <= 16 so page-table tile indices fit one byte");
        this.layers = this.type === "cube" ? 6 : Math.max(1, Math.floor(faoxomvalue(zavkb.layers, this.type === "array" ? 2 : 1)));
        this.virtualSize = Math.floor(faoxomvalue(zavkb.virtualSize, 2048));
        if (this.virtualSize < this.pageSize || (this.virtualSize & this.virtualSize - 1) !== 0) throw new Error("virtualSize must be a power of two >= pageSize");
        this.tableSize = this.virtualSize / this.pageSize;
        this.mipCount = Math.max(1, Math.round(Math.log2(this.tableSize)) + 1);
        this.maxMip = this.mipCount - 1;
        this.tileCount = this.tiles * this.tiles;
        this.format = faoxomvalue(zavkb.format, "rgba8unorm");
        this.bytesPerPixel = this.format === "rgba8unorm" ? 4 : 4;
        this.pages = new Map;
        this.tileOwners = new Array(this.tileCount).fill(null);
        this.freeTiles = [];
        for (var zavkd = this.tileCount - 1; zavkd >= 0; zavkd--) this.freeTiles.push(zavkd);
        this.frame = 0;
        this.mipBases = [];
        var zavke = 0;
        for (var zavkf = 0; zavkf < this.mipCount; zavkf++) {
            this.mipBases.push(zavke);
            zavke += this.pageCount(zavkf);
        }
        this.pagesPerLayer = zavke;
        this.totalPages = this.pagesPerLayer * this.layers;
        this.tableData = [];
        for (var zavkg = 0; zavkg < this.layers; zavkg++) {
            var zavkh = [];
            for (var zavki = 0; zavki < this.mipCount; zavki++) {
                var zavkj = this.tableSide(zavki);
                zavkh.push(new Uint8Array(zavkj * zavkj * 4));
            }
            this.tableData.push(zavkh);
        }
        this.atlasTexture = zavkc.createTexture({
            size: [ this.pageSize * this.tiles, this.pageSize * this.tiles, 1 ],
            dimension: "2d",
            format: this.format,
            mipLevelCount: 1,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC
        });
        this.tableTexture = zavkc.createTexture({
            size: [ this.tableSize, this.tableSize, this.layers ],
            dimension: "2d",
            format: this.format,
            mipLevelCount: this.mipCount,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC
        });
        this.atlasView = this.atlasTexture.createView();
        this.tableView = this.tableTexture.createView({
            dimension: "2d-array"
        });
        this.tableSampler = zavkc.createSampler({
            magFilter: "nearest",
            minFilter: "nearest",
            mipmapFilter: "nearest"
        });
        this.atlasSampler = zavkc.createSampler({
            magFilter: "linear",
            minFilter: "linear"
        });
        this.stats = {
            uploads: 0,
            evictions: 0,
            tableFlushes: 0
        };
    }
    tableSide(zavka) {
        return Math.max(1, this.tableSize >> Math.min(zavka, this.maxMip));
    }
    pageCount(zavka) {
        var zavkb = this.tableSide(zavka);
        return zavkb * zavkb;
    }
    pageKey(zavka, zavkb, zavkc, zavkd) {
        return zavkb + ":" + zavka + ":" + zavkc + ":" + zavkd;
    }
    pageId(zavka, zavkb, zavkc, zavkd) {
        var zavke = this.tableSide(zavka);
        return zavkb * this.pagesPerLayer + this.mipBases[zavka] + zavkd * zavke + zavkc;
    }
    pageFromId(zavka) {
        var zavkb = Math.floor(zavka / this.pagesPerLayer);
        var zavkc = zavka - zavkb * this.pagesPerLayer;
        var zavkd = 0;
        while (zavkd + 1 < this.mipCount && zavkc >= this.mipBases[zavkd + 1]) zavkd++;
        var zavke = this.tableSide(zavkd);
        var zavkf = zavkc - this.mipBases[zavkd];
        return {
            layer: zavkb,
            mip: zavkd,
            px: zavkf % zavke,
            py: Math.floor(zavkf / zavke)
        };
    }
    isResident(zavka, zavkb, zavkc, zavkd) {
        return this.pages.has(this.pageKey(zavka, zavkb, zavkc, zavkd));
    }
    allocateTile() {
        return this.freeTiles.length ? this.freeTiles.pop() : null;
    }
    setPage(zavka, zavkb, zavkc, zavkd, zavke) {
        zavka = Math.min(zavka, this.maxMip);
        var zavkf = this.tableSide(zavka);
        if (zavkc < 0 || zavkd < 0 || zavkc >= zavkf || zavkd >= zavkf || zavkb < 0 || zavkb >= this.layers) return null;
        var zavkg = this.pageKey(zavka, zavkb, zavkc, zavkd);
        var zavkh = this.pages.get(zavkg);
        if (zavkh) this.releasePage(zavkg, zavkh);
        var zavki = this.tableData[zavkb][zavka];
        var zavkj = (zavkd * zavkf + zavkc) * 4;
        zavki[zavkj] = zavke & 255;
        zavki[zavkj + 1] = 0;
        zavki[zavkj + 2] = 0;
        zavki[zavkj + 3] = 255;
        this.tileOwners[zavke] = zavkg;
        this.pages.set(zavkg, {
            tile: zavke,
            lastUsed: this.frame,
            pinned: zavkh ? zavkh.pinned : false
        });
        return zavkg;
    }
    releasePage(zavka, zavkb) {
        if (!zavkb) zavkb = this.pages.get(zavka);
        if (!zavkb) return false;
        var zavkc = zavka.split(":");
        var zavkd = this.tableData[Number(zavkc[0])][Number(zavkc[1])];
        var zavke = this.tableSide(Number(zavkc[1]));
        var zavkf = (Number(zavkc[3]) * zavke + Number(zavkc[2])) * 4;
        zavkd[zavkf] = 0;
        zavkd[zavkf + 3] = 0;
        if (this.tileOwners[zavkb.tile] === zavka) this.tileOwners[zavkb.tile] = null;
        if (this.freeTiles.indexOf(zavkb.tile) === -1) this.freeTiles.push(zavkb.tile);
        this.pages.delete(zavka);
        return true;
    }
    touch(zavka, zavkb, zavkc, zavkd) {
        var zavke = this.pages.get(this.pageKey(zavka, zavkb, zavkc, zavkd));
        if (zavke) zavke.lastUsed = this.frame;
        return !!zavke;
    }
    pinPage(zavka, zavkb, zavkc, zavkd, zavke) {
        var zavkf = this.pages.get(this.pageKey(zavka, zavkb, zavkc, zavkd));
        if (zavkf) zavkf.pinned = zavke !== false;
        return !!zavkf;
    }
    evictLRU(zavka) {
        var zavkb = [];
        this.pages.forEach(function(zavka, zavkc) {
            if (!zavka.pinned) zavkb.push({
                key: zavkc,
                entry: zavka
            });
        });
        zavkb.sort(function(zavka, zavkb) {
            return zavka.entry.lastUsed - zavkb.entry.lastUsed;
        });
        var zavkc = 0;
        for (var zavkd = 0; zavkd < zavkb.length && zavkc < zavka; zavkd++) {
            this.releasePage(zavkb[zavkd].key, zavkb[zavkd].entry);
            zavkc++;
        }
        this.stats.evictions += zavkc;
        return zavkc;
    }
    uploadTile(zavka, zavkb) {
        var zavkc = this.pageSize * this.pageSize * this.bytesPerPixel;
        var zavkd = zavkb;
        if (!zavkd) return this;
        if (zavkd instanceof ImageData) zavkd = new Uint8Array(zavkd.data.buffer ? zavkd.data.buffer.slice(zavkd.data.byteOffset, zavkd.data.byteOffset + zavkd.data.byteLength) : zavkd.data);
        if (zavkd.byteLength < zavkc) {
            var zavke = new Uint8Array(zavkc);
            zavke.set(new Uint8Array(zavkd.buffer || zavkd, zavkd.byteOffset || 0, Math.min(zavkd.byteLength || zavkd.length, zavkc)));
            zavkd = zavke;
        }
        var zavkf = this.pageSize * this.bytesPerPixel;
        var zavkg = Math.ceil(zavkf / 256) * 256;
        if (zavkg === zavkf) {
            this.renderer.device.queue.writeTexture({
                texture: this.atlasTexture,
                origin: {
                    x: zavka % this.tiles * this.pageSize,
                    y: Math.floor(zavka / this.tiles) * this.pageSize,
                    z: 0
                }
            }, zavkd, {
                bytesPerRow: zavkf,
                rowsPerImage: this.pageSize
            }, [ this.pageSize, this.pageSize, 1 ]);
        } else {
            var zavkh = new Uint8Array(zavkg * this.pageSize);
            var zavki = new Uint8Array(zavkd.buffer || zavkd, zavkd.byteOffset || 0, zavkc);
            for (var zavkj = 0; zavkj < this.pageSize; zavkj++) zavkh.set(zavki.subarray(zavkj * zavkf, zavkj * zavkf + zavkf), zavkj * zavkg);
            this.renderer.device.queue.writeTexture({
                texture: this.atlasTexture,
                origin: {
                    x: zavka % this.tiles * this.pageSize,
                    y: Math.floor(zavka / this.tiles) * this.pageSize,
                    z: 0
                }
            }, zavkh, {
                bytesPerRow: zavkg,
                rowsPerImage: this.pageSize
            }, [ this.pageSize, this.pageSize, 1 ]);
        }
        this.stats.uploads++;
        return this;
    }
    async readTile(zavka) {
        var zavkb = this.renderer.device;
        var zavkc = this.pageSize * this.bytesPerPixel;
        var zavkd = Math.ceil(zavkc / 256) * 256;
        var zavke = zavkb.createBuffer({
            size: zavkd * this.pageSize,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        var zavkf = zavkb.createCommandEncoder();
        zavkf.copyTextureToBuffer({
            texture: this.atlasTexture,
            origin: {
                x: zavka % this.tiles * this.pageSize,
                y: Math.floor(zavka / this.tiles) * this.pageSize,
                z: 0
            }
        }, {
            buffer: zavke,
            bytesPerRow: zavkd,
            rowsPerImage: this.pageSize
        }, [ this.pageSize, this.pageSize, 1 ]);
        zavkb.queue.submit([ zavkf.finish() ]);
        await zavkb.queue.onSubmittedWorkDone();
        await zavke.mapAsync(GPUMapMode.READ);
        var zavkg = new Uint8Array(zavke.getMappedRange());
        var zavkh = new Uint8Array(zavkc * this.pageSize);
        for (var zavki = 0; zavki < this.pageSize; zavki++) zavkh.set(zavkg.subarray(zavki * zavkd, zavki * zavkd + zavkc), zavki * zavkc);
        zavke.unmap();
        zavke.destroy();
        return zavkh;
    }
    async readTableTexel(zavka, zavkb, zavkc, zavkd) {
        var zavke = this.renderer.device;
        var zavkf = this.tableSide(zavka);
        var zavkg = zavke.createBuffer({
            size: 256,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        var zavkh = zavke.createCommandEncoder();
        zavkh.copyTextureToBuffer({
            texture: this.tableTexture,
            mipLevel: zavka,
            origin: {
                x: zavkc,
                y: zavkd,
                z: zavkb
            }
        }, {
            buffer: zavkg,
            bytesPerRow: 256,
            rowsPerImage: 1
        }, [ 1, 1, 1 ]);
        zavke.queue.submit([ zavkh.finish() ]);
        await zavke.queue.onSubmittedWorkDone();
        await zavkg.mapAsync(GPUMapMode.READ);
        var zavki = new Uint8Array(zavkg.getMappedRange()).slice();
        zavkg.unmap();
        zavkg.destroy();
        return [ zavki[0], zavki[1], zavki[2], zavki[3] ];
    }
    flushTable() {
        var zavka = this.renderer.device;
        for (var zavkb = 0; zavkb < this.layers; zavkb++) for (var zavkc = 0; zavkc < this.mipCount; zavkc++) {
            var zavkd = this.tableSide(zavkc);
            var zavke = zavkd * 4;
            var zavkf = Math.ceil(zavke / 256) * 256;
            var zavkg = this.tableData[zavkb][zavkc];
            if (zavkf === zavke) {
                zavka.queue.writeTexture({
                    texture: this.tableTexture,
                    mipLevel: zavkc,
                    origin: {
                        x: 0,
                        y: 0,
                        z: zavkb
                    }
                }, zavkg, {
                    bytesPerRow: zavke,
                    rowsPerImage: zavkd
                }, [ zavkd, zavkd, 1 ]);
            } else {
                var zavkh = new Uint8Array(zavkf * zavkd);
                for (var zavki = 0; zavki < zavkd; zavki++) zavkh.set(zavkg.subarray(zavki * zavke, zavki * zavke + zavke), zavki * zavkf);
                zavka.queue.writeTexture({
                    texture: this.tableTexture,
                    mipLevel: zavkc,
                    origin: {
                        x: 0,
                        y: 0,
                        z: zavkb
                    }
                }, zavkh, {
                    bytesPerRow: zavkf,
                    rowsPerImage: zavkd
                }, [ zavkd, zavkd, 1 ]);
            }
        }
        this.stats.tableFlushes++;
        return this;
    }
    advanceFrame() {
        this.frame++;
        return this;
    }
    sampleWGSL(zavka, zavkb, zavkc, zavkd, zavke, zavkf) {
        var zavkg = this.tiles.toFixed(1);
        var zavkh = (.5 / this.pageSize).toFixed(8);
        var zavki = this.maxMip.toFixed(1);
        var zavkj = this.tableSize.toFixed(1);
        var zavkk = zavkf || "vec4<f32>(0.5, 0.5, 0.5, 1.0)";
        var zavkl = zavka || "vt";
        return "fn " + zavkl + "Page(uv: vec2<f32>, layer: f32, tableMip: f32) -> vec4<f32> { let m = clamp(floor(tableMip + 0.5), 0.0, " + zavki + "); let side = max(floor(" + zavkj + " / pow(2.0, m)), 1.0); let scaled = uv * vec2<f32>(side, side); let entry = textureSampleLevel(" + zavkb + ", " + zavkc + ", uv, i32(clamp(layer, 0.0, 255.0)), m); if (entry.a < 0.5) { return " + zavkk + "; } let tile = floor(entry.r * 255.0 + 0.5); let tilesF = " + zavkg + "; let tileX = tile - floor(tile / tilesF) * tilesF; let tileY = floor(tile / tilesF); var local = fract(scaled); local = clamp(local, vec2<f32>(" + zavkh + "), vec2<f32>(1.0 - " + zavkh + ")); let atlasUv = (vec2<f32>(tileX, tileY) + local) / vec2<f32>(tilesF, tilesF); return textureSampleLevel(" + zavkd + ", " + zavke + ", atlasUv, 0.0); } fn " + zavkl + "TableMip(uv: vec2<f32>, virtualSize: f32, pageSize: f32, maxMip: f32) -> f32 { let dx = abs(dpdx(uv).x); let dy = abs(dpdy(uv).y); let density = max(max(dx, dy) * virtualSize / pageSize, 0.000001); return clamp(floor(log2(density) + 0.5), 0.0, maxMip); }";
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
