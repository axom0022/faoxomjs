import { StandardMaterial } from "../materials/index.js";
import { Matrix4 } from "../math/index.js";
import { Quaternion } from "../math/index.js";
import { Vector3 } from "../math/index.js";
import { Group } from "../objects/index.js";
import { InstancedMesh } from "../objects/index.js";
import { PCGRandom } from "./PCGToolkit.js";
import { faoxomvalue } from "../math/index.js";

function scatterSampler(source) {
    if (typeof source === "function") return { heightAt: function (x, z) { return source(x, z); } };
    if (source && typeof source.heightAt === "function") return source;
    if (source && typeof source.getHeight === "function") return { heightAt: function (x, z) { return source.getHeight(x, z); }, slopeAt: source.slopeAt, zoneAt: source.zoneAt };
    throw new Error("ScatterField source must be a function or expose heightAt/getHeight");
}

function chunkSeed(seed, cx, cz) {
    var h = (seed | 0) ^ Math.imul(cx | 0, 374761393) ^ Math.imul(cz | 0, 668265263);
    h = h ^ (h >>> 13); h = Math.imul(h, 1274126177); h = h ^ (h >>> 16);
    return h | 0;
}

class ScatterField extends Group {
    constructor(source, layers, options) {
        super();
        options = options || {};
        this.type = "ScatterField";
        this.sampler = scatterSampler(source);
        this.layers = [];
        this.seed = faoxomvalue(options.seed, 1) | 0;
        this.chunkSize = Math.max(0.001, faoxomvalue(options.chunkSize, 32));
        this.viewChunks = Math.max(0, Math.floor(faoxomvalue(options.viewChunks, 8)));
        this.maxChunksPerFrame = Math.max(0, faoxomvalue(options.maxChunksPerFrame, 2));
        this.capacityMargin = Math.max(1, faoxomvalue(options.capacityMargin, 1.5));
        this.normalEpsilon = Math.max(0.0001, faoxomvalue(options.normalEpsilon, 0.5));
        this.centerChunk = null;
        this.chunks = new Map();
        this.queue = [];
        this.stats = { chunks: 0, pending: 0, instances: 0, generatedChunks: 0, layerInstances: [] };
        var list = Array.isArray(layers) ? layers : (layers ? [layers] : []);
        for (var i = 0; i < list.length; i++) this.addLayer(list[i]);
    }
    addLayer(layer) {
        if (!layer || !layer.geometry) throw new Error("ScatterField layer requires geometry");
        var entry = {
            geometry: layer.geometry,
            material: layer.material || new StandardMaterial(),
            density: Math.max(0, faoxomvalue(layer.density, 0.1)),
            mode: layer.mode === "poisson" ? "poisson" : "jitter",
            minSpacing: Math.max(0, faoxomvalue(layer.minSpacing, 0)),
            maxAttempts: Math.max(1, faoxomvalue(layer.maxAttempts, 30)),
            minHeight: layer.minHeight !== undefined ? layer.minHeight : -Infinity,
            maxHeight: layer.maxHeight !== undefined ? layer.maxHeight : Infinity,
            minSlope: faoxomvalue(layer.minSlope, 0),
            maxSlope: layer.maxSlope !== undefined ? layer.maxSlope : Math.PI,
            zones: Array.isArray(layer.zones) ? layer.zones : null,
            scaleMin: faoxomvalue(layer.scaleMin, 1),
            scaleMax: faoxomvalue(layer.scaleMax, layer.scaleMin !== undefined ? layer.scaleMin : 1),
            rotation: layer.rotation === undefined ? "random" : layer.rotation,
            alignToNormal: Math.min(1, Math.max(0, faoxomvalue(layer.alignToNormal, 0))),
            yOffset: faoxomvalue(layer.yOffset, 0),
            mesh: null,
            capacity: 0
        };
        entry.scaleMax = Math.max(entry.scaleMin, entry.scaleMax);
        this.layers.push(entry);
        return entry;
    }
    ensureLayerMesh(entry, needed) {
        if (entry.mesh && entry.capacity >= needed) { entry.mesh.count = needed; return entry.mesh; }
        var capacity = Math.max(64, Math.ceil(needed * this.capacityMargin));
        var mesh = new InstancedMesh(entry.geometry, entry.material, capacity);
        mesh.count = needed;
        mesh.frustumCulled = false;
        if (entry.mesh) {
            mesh.instanceMatrices.set(entry.mesh.instanceMatrices.subarray(0, Math.min(entry.mesh.count * 16, mesh.instanceMatrices.length)));
            this.remove(entry.mesh);
        }
        entry.mesh = mesh;
        entry.capacity = capacity;
        this.add(mesh);
        return mesh;
    }
    releaseLayerMeshes() {
        for (var i = 0; i < this.layers.length; i++) {
            var entry = this.layers[i];
            if (entry.mesh) { this.remove(entry.mesh); entry.mesh = null; entry.capacity = 0; }
        }
    }
    slopeAt(x, z) {
        if (this.sampler.slopeAt) return this.sampler.slopeAt(x, z);
        var e = this.normalEpsilon, h = this.sampler.heightAt;
        var gx = (h(x + e, z) - h(x - e, z)) / (2 * e);
        var gz = (h(x, z + e) - h(x, z - e)) / (2 * e);
        return Math.atan(Math.sqrt(gx * gx + gz * gz));
    }
    normalAt(x, z, target) {
        var e = this.normalEpsilon, h = this.sampler.heightAt;
        var gx = (h(x + e, z) - h(x - e, z)) / (2 * e);
        var gz = (h(x, z + e) - h(x, z - e)) / (2 * e);
        var nx = -gx, ny = 1, nz = -gz;
        var len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        target = target || new Vector3();
        target.set(nx / len, ny / len, nz / len);
        return target;
    }
    generateChunk(cx, cz) {
        var key = cx + "," + cz;
        if (this.chunks.has(key)) return null;
        var data = { cx: cx, cz: cz, blocks: [], count: 0 };
        var originX = cx * this.chunkSize, originZ = cz * this.chunkSize;
        for (var i = 0; i < this.layers.length; i++) {
            var entry = this.layers[i];
            var rng = new PCGRandom(chunkSeed(this.seed ^ Math.imul(i + 1, 913531), cx, cz));
            var points = [];
            var area = this.chunkSize * this.chunkSize;
            if (entry.mode === "poisson" && entry.minSpacing > 0) {
                var radius = entry.minSpacing;
                var cell = radius / Math.SQRT2;
                var gw = Math.max(1, Math.ceil(this.chunkSize / cell));
                var grid = new Int32Array(gw * gw).fill(-1);
                var active = [];
                var limit = Math.max(1, Math.floor(entry.density * area));
                var attempts = 0;
                var first = { x: rng.range(0, this.chunkSize), z: rng.range(0, this.chunkSize) };
                points.push(first);
                grid[Math.min(gw - 1, first.x / cell | 0) + Math.min(gw - 1, first.z / cell | 0) * gw] = 0;
                active.push(0);
                while (active.length > 0 && points.length < limit && attempts < entry.maxAttempts * limit) {
                    attempts++;
                    var ai = rng.int(0, active.length - 1);
                    var p0 = points[active[ai]];
                    var accepted = false;
                    for (var c = 0; c < 10 && !accepted; c++) {
                        var ang = rng.range(0, Math.PI * 2);
                        var dist = rng.range(radius, radius * 2);
                        var px = p0.x + Math.cos(ang) * dist, pz = p0.z + Math.sin(ang) * dist;
                        if (px < 0 || pz < 0 || px >= this.chunkSize || pz >= this.chunkSize) continue;
                        var gx = Math.min(gw - 1, px / cell | 0), gz = Math.min(gw - 1, pz / cell | 0);
                        var ok = true;
                        for (var dz = -2; dz <= 2 && ok; dz++) {
                            for (var dx = -2; dx <= 2 && ok; dx++) {
                                var nx = gx + dx, nz = gz + dz;
                                if (nx < 0 || nz < 0 || nx >= gw || nz >= gw) continue;
                                var oi = grid[nz * gw + nx];
                                if (oi >= 0) {
                                    var q = points[oi];
                                    var ddx = q.x - px, ddz = q.z - pz;
                                    if (ddx * ddx + ddz * ddz < radius * radius) ok = false;
                                }
                            }
                        }
                        if (!ok) continue;
                        points.push({ x: px, z: pz });
                        grid[gz * gw + gx] = points.length - 1;
                        active.push(points.length - 1);
                        accepted = true;
                    }
                    if (!accepted) {
                        active[ai] = active[active.length - 1];
                        active.pop();
                    }
                }
            } else {
                var want = Math.floor(entry.density * area + rng.next());
                for (var w = 0; w < want; w++) {
                    var jx = rng.range(0, this.chunkSize), jz = rng.range(0, this.chunkSize);
                    if (entry.minSpacing > 0) {
                        var fine = true;
                        for (var pp = 0; pp < points.length && fine; pp++) {
                            var ddx2 = points[pp].x - jx, ddz2 = points[pp].z - jz;
                            if (ddx2 * ddx2 + ddz2 * ddz2 < entry.minSpacing * entry.minSpacing) fine = false;
                        }
                        if (!fine) continue;
                    }
                    points.push({ x: jx, z: jz });
                }
            }
            var matrices = [];
            var up = new Vector3(0, 1, 0);
            var nrm = new Vector3();
            var quat = new Quaternion();
            var spin = new Quaternion();
            var pos = new Vector3();
            var scl = new Vector3();
            var mat = new Matrix4();
            for (var pt = 0; pt < points.length; pt++) {
                var wx = originX + points[pt].x, wz = originZ + points[pt].z;
                var h = this.sampler.heightAt(wx, wz);
                if (h < entry.minHeight || h > entry.maxHeight) continue;
                var slope = this.slopeAt(wx, wz);
                if (slope < entry.minSlope || slope > entry.maxSlope) continue;
                if (entry.zones && this.sampler.zoneAt) {
                    var zone = this.sampler.zoneAt(wx, wz);
                    if (entry.zones.indexOf(zone) === -1) continue;
                }
                var scale = rng.range(entry.scaleMin, entry.scaleMax);
                var rotY = entry.rotation === "random" ? rng.range(0, Math.PI * 2) : entry.rotation;
                pos.set(wx, h + entry.yOffset, wz);
                scl.set(scale, scale, scale);
                quat.set(0, 0, 0, 1);
                if (entry.alignToNormal > 0) {
                    this.normalAt(wx, wz, nrm);
                    spin.setFromUnitVectors(up, nrm);
                    var t = entry.alignToNormal;
                    quat.set(spin.x * t, spin.y * t, spin.z * t, 1 + t * (spin.w - 1));
                    quat.normalize();
                }
                spin.setFromAxisAngle(up, rotY);
                quat.premultiply(spin);
                mat.compose(pos, quat, scl);
                matrices.push(mat.clone());
            }
            data.blocks.push(matrices);
            data.count += matrices.length;
        }
        return data;
    }
    repack() {
        var totals = [];
        for (var i = 0; i < this.layers.length; i++) totals.push(0);
        this.chunks.forEach(function (chunk) {
            for (var j = 0; j < chunk.blocks.length; j++) totals[j] += chunk.blocks[j].length;
        });
        for (var m = 0; m < this.layers.length; m++) this.ensureLayerMesh(this.layers[m], totals[m]);
        var cursors = [];
        for (var c = 0; c < this.layers.length; c++) cursors.push(0);
        var self = this;
        this.chunks.forEach(function (chunk) {
            for (var l = 0; l < chunk.blocks.length; l++) {
                var block = chunk.blocks[l];
                var mesh = self.layers[l].mesh;
                for (var v = 0; v < block.length; v++) mesh.setMatrixAt(cursors[l] + v, block[v]);
                cursors[l] += block.length;
            }
        });
        for (var n = 0; n < this.layers.length; n++) {
            var meshn = this.layers[n].mesh;
            meshn.count = totals[n];
            meshn.visible = totals[n] > 0;
            meshn.instanceMatrix.needsUpdate = true;
            meshn.instanceMatrix.version++;
            meshn.instanceNeedsUpdate = true;
        }
        this.stats.instances = 0;
        for (var s = 0; s < totals.length; s++) this.stats.instances += totals[s];
        this.stats.layerInstances = totals;
        this.stats.chunks = this.chunks.size;
    }
    update(point) {
        var p = point && point.position ? point.position : point || { x: 0, z: 0 };
        var cx = Math.floor(faoxomvalue(p.x, 0) / this.chunkSize);
        var cz = Math.floor(faoxomvalue(p.z, 0) / this.chunkSize);
        var removedCount = 0;
        if (!this.centerChunk || this.centerChunk.cx !== cx || this.centerChunk.cz !== cz) {
            this.centerChunk = { cx: cx, cz: cz };
            var desired = [];
            for (var dz = -this.viewChunks; dz <= this.viewChunks; dz++) {
                for (var dx = -this.viewChunks; dx <= this.viewChunks; dx++) {
                    if (dx * dx + dz * dz > this.viewChunks * this.viewChunks + this.viewChunks) continue;
                    desired.push((cx + dx) + "," + (cz + dz));
                }
            }
            var keep = new Set(desired);
            var removed = [];
            this.chunks.forEach(function (chunk, key) {
                if (!keep.has(key)) removed.push(key);
            });
            removedCount = removed.length;
            for (var r = 0; r < removed.length; r++) this.chunks.delete(removed[r]);
            this.queue = [];
            for (var d = 0; d < desired.length; d++) if (!this.chunks.has(desired[d])) this.queue.push(desired[d]);
            this.queue.sort(function (a, b) {
                var pa = a.split(","), pb = b.split(",");
                var dax = (+pa[0] - cx), daz = (+pa[1] - cz), dbx = (+pb[0] - cx), dbz = (+pb[1] - cz);
                return (dax * dax + daz * daz) - (dbx * dbx + dbz * dbz);
            });
        }
        var budget = this.maxChunksPerFrame === 0 ? this.queue.length : this.maxChunksPerFrame;
        var added = 0;
        while (added < budget && this.queue.length > 0) {
            var key = this.queue.shift();
            if (this.chunks.has(key)) continue;
            var parts = key.split(",");
            var chunk = this.generateChunk(+parts[0], +parts[1]);
            if (chunk) { this.chunks.set(key, chunk); this.stats.generatedChunks++; added++; }
        }
        if (added > 0 || this.stats.chunks !== this.chunks.size) this.repack();
        this.stats.pending = this.queue.length;
        this.stats.chunks = this.chunks.size;
        return { added: added, pending: this.queue.length, removed: removedCount };
    }
    chunkCount() { return this.chunks.size; }
    instanceCount() { return this.stats.instances; }
    clear() {
        this.chunks.clear();
        this.queue = [];
        this.centerChunk = null;
        this.repack();
        return this;
    }
    dispose() {
        this.clear();
        this.releaseLayerMeshes();
        this.layers = [];
        return this;
    }
}

export { ScatterField };
