import { Geometry, faoxomgeometry } from "../geometries/index.js";
import { StandardMaterial } from "../materials/index.js";
import { Mesh } from "../objects/index.js";
import { Group } from "../objects/index.js";
import { faoxomvalue } from "../math/index.js";

function normalizeSampler(sampler) {
    if (typeof sampler === "function") return { heightAt: function (x, z) { return sampler(x, z); } };
    if (sampler && typeof sampler.heightAt === "function") return sampler;
    if (sampler && typeof sampler.getHeight === "function") return { heightAt: function (x, z) { return sampler.getHeight(x, z); }, slopeAt: sampler.slopeAt, zoneAt: sampler.zoneAt };
    throw new Error("TerrainClipmap sampler must be a function or expose heightAt/getHeight");
}

class TerrainClipmap extends Group {
    constructor(sampler, options) {
        super();
        options = options || {};
        this.type = "TerrainClipmap";
        this.sampler = normalizeSampler(sampler);
        this.levels = Math.max(1, Math.floor(faoxomvalue(options.levels, 6)));
        var ring = Math.floor(faoxomvalue(options.ringRadius, 16));
        if (ring < 2) ring = 2;
        if (ring % 2 === 1) ring = ring + 1;
        this.ringRadius = ring;
        this.spacing = Math.max(0.0001, faoxomvalue(options.spacing, 1));
        this.material = options.material || new StandardMaterial();
        this.skirtDepth = faoxomvalue(options.skirtDepth, 0);
        this.origin = { x: options.origin && options.origin.x !== undefined ? options.origin.x : 0, z: options.origin && options.origin.z !== undefined ? options.origin.z : 0 };
        this.maxUpdatesPerFrame = Math.max(0, faoxomvalue(options.maxUpdatesPerFrame, 0));
        this.uvScale = Math.max(0.0001, faoxomvalue(options.uvScale, 0.1));
        this.stats = { levels: this.levels, vertices: 0, triangles: 0, rebuilds: 0, lastUpdated: [], samplerCalls: 0 };
        this.leveldata = [];
        for (var l = 0; l < this.levels; l++) {
            var s = this.spacing * Math.pow(2, l);
            this.leveldata.push({ level: l, spacing: s, half: ring * s, mesh: null, center: null, dirty: true, holeHalf: l === 0 ? 0 : ring * s / 2 - s, skirt: this.skirtDepth > 0 ? this.skirtDepth : 2 * s });
        }
        this.update({ x: this.origin.x, z: this.origin.z });
    }
    heightAt(x, z) { return this.sampler.heightAt(x, z); }
    normalAt(x, z, target) {
        var s = this.sampler;
        var e = this.spacing * 0.5;
        var hx = s.heightAt(x + e, z) - s.heightAt(x - e, z);
        var hz = s.heightAt(x, z + e) - s.heightAt(x, z - e);
        var nx = -hx, ny = 2 * e, nz = -hz;
        var len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        var out = target || { x: 0, y: 1, z: 0 };
        out.x = nx / len; out.y = ny / len; out.z = nz / len;
        return out;
    }
    snapCenter(x, z, spacing) {
        var step = spacing * 2;
        return { x: this.origin.x + Math.round((x - this.origin.x) / step) * step, z: this.origin.z + Math.round((z - this.origin.z) / step) * step };
    }
    update(camera) {
        var p = camera && camera.position ? camera.position : camera || { x: this.origin.x, z: this.origin.z };
        var px = faoxomvalue(p.x, this.origin.x), pz = faoxomvalue(p.z, this.origin.z);
        var budget = this.maxUpdatesPerFrame;
        var updated = [];
        for (var i = 0; i < this.leveldata.length; i++) {
            var ld = this.leveldata[i];
            var target = this.snapCenter(px, pz, ld.spacing);
            if (!ld.center || ld.center.x !== target.x || ld.center.z !== target.z) { ld.center = target; ld.dirty = true; }
            if (ld.dirty && (budget === 0 || updated.length < budget || i === 0)) {
                this.rebuildLevel(ld);
                updated.push(i);
            }
        }
        this.stats.lastUpdated = updated;
        return { updated: updated, pending: this.leveldata.filter(function (l) { return l.dirty; }).length };
    }
    buildLevelGeometry(ld) {
        var R = this.ringRadius, s = ld.spacing, hole = ld.holeHalf;
        var count = 2 * R + 1;
        var cx = ld.center.x, cz = ld.center.z;
        var p = [], n = [], u = [], vindex = [];
        var grid = new Int32Array(count * count);
        var positions = new Float32Array(count * count * 3);
        var normals = new Float32Array(count * count * 3);
        var uvs = new Float32Array(count * count * 2);
        var calls = 0;
        var hfn = this.sampler.heightAt;
        for (var j = 0; j < count; j++) {
            for (var k = 0; k < count; k++) {
                var lx = (k - R) * s, lz = (j - R) * s;
                var wx = cx + lx, wz = cz + lz;
                var h = hfn(wx, wz); calls++;
                var e = s;
                var hx = hfn(wx + e, wz) - hfn(wx - e, wz); calls += 2;
                var hz = hfn(wx, wz + e) - hfn(wx, wz - e); calls += 2;
                var nx = -hx, ny = 2 * e, nz = -hz;
                var len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
                var gi = j * count + k;
                grid[gi] = gi;
                positions[gi * 3] = lx; positions[gi * 3 + 1] = h; positions[gi * 3 + 2] = lz;
                normals[gi * 3] = nx / len; normals[gi * 3 + 1] = ny / len; normals[gi * 3 + 2] = nz / len;
                uvs[gi * 2] = wx * this.uvScale; uvs[gi * 2 + 1] = wz * this.uvScale;
            }
        }
        var skirtindex = new Int32Array(count * count);
        var skirtverts = [];
        function boundaryIndex(j, k) {
            var gi = j * count + k;
            if (skirtindex[gi] === 0) {
                skirtindex[gi] = p.length / 3 + 1;
                skirtverts.push(gi);
            }
            return skirtindex[gi] - 1;
        }
        function pushvert(gi, dy) {
            p.push(positions[gi * 3], positions[gi * 3 + 1] - dy, positions[gi * 3 + 2]);
            n.push(normals[gi * 3], normals[gi * 3 + 1], normals[gi * 3 + 2]);
            u.push(uvs[gi * 2], uvs[gi * 2 + 1]);
            return p.length / 3 - 1;
        }
        for (var pj = 0; pj < count; pj++) {
            for (var pk = 0; pk < count; pk++) {
                var gi2 = pj * count + pk;
                pushvert(gi2, 0);
            }
        }
        for (var qj = 0; qj < 2 * R; qj++) {
            for (var qk = 0; qk < 2 * R; qk++) {
                var x0 = (qk - R) * s, x1 = (qk + 1 - R) * s;
                var z0 = (qj - R) * s, z1 = (qj + 1 - R) * s;
                var drop = hole > 0 && !(x0 >= hole || x1 <= -hole || z0 >= hole || z1 <= -hole);
                if (drop) continue;
                var a = grid[qj * count + qk], b = grid[qj * count + qk + 1];
                var c = grid[(qj + 1) * count + qk], d = grid[(qj + 1) * count + qk + 1];
                vindex.push(a, c, b, b, c, d);
            }
        }
        var depth = ld.skirt;
        var edges = [
            { fixed: "z", value: 0 }, { fixed: "z", value: count - 1 },
            { fixed: "x", value: 0 }, { fixed: "x", value: count - 1 }
        ];
        for (var ei = 0; ei < edges.length; ei++) {
            var edge = edges[ei];
            for (var t = 0; t < 2 * R; t++) {
                var j0, k0, j1, k1;
                if (edge.fixed === "z") { j0 = edge.value; k0 = t; j1 = edge.value; k1 = t + 1; }
                else { j0 = t; k0 = edge.value; j1 = t + 1; k1 = edge.value; }
                var vA = grid[j0 * count + k0], vB = grid[j1 * count + k1];
                var sA = boundaryIndex(j0, k0), sB = boundaryIndex(j1, k1);
                vindex.push(vA, vB, sA, sA, vB, sB);
                vindex.push(vA, sA, vB, vB, sA, sB);
            }
        }
        for (var sv = 0; sv < skirtverts.length; sv++) {
            pushvert(skirtverts[sv], depth);
        }
        this.stats.samplerCalls += calls;
        return { position: p, normal: n, uv: u, index: vindex, calls: calls };
    }
    rebuildLevel(ld) {
        if (!ld.center) ld.center = this.snapCenter(this.origin.x, this.origin.z, ld.spacing);
        var built = this.buildLevelGeometry(ld);
        var geometry = new Geometry();
        var fg = faoxomgeometry(built.position, built.normal, built.uv, built.index);
        geometry.attributes = fg.attributes;
        geometry.index = fg.index instanceof Uint32Array ? fg.index : new Uint32Array(fg.index);
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        if (ld.mesh) {
            ld.mesh.geometry.dispose();
            ld.mesh.geometry = geometry;
            ld.mesh.position.set(ld.center.x, 0, ld.center.z);
        } else {
            ld.mesh = new Mesh(geometry, this.material);
            ld.mesh.type = "TerrainClipmapLevel";
            ld.mesh.frustumCulled = true;
            ld.mesh.position.set(ld.center.x, 0, ld.center.z);
            this.add(ld.mesh);
        }
        ld.dirty = false;
        this.stats.rebuilds++;
        return ld.mesh;
    }
    setSampler(sampler) {
        this.sampler = normalizeSampler(sampler);
        for (var i = 0; i < this.leveldata.length; i++) this.leveldata[i].dirty = true;
        return this;
    }
    levelInfo(level) {
        var ld = this.leveldata[level];
        if (!ld) return null;
        return { level: level, spacing: ld.spacing, half: ld.half, holeHalf: ld.holeHalf, center: ld.center ? { x: ld.center.x, z: ld.center.z } : null, vertices: ld.mesh ? ld.mesh.geometry.attributes.position.array.length / 3 : 0, triangles: ld.mesh ? ld.mesh.geometry.index.length / 3 : 0, dirty: ld.dirty };
    }
    covers(x, z) {
        for (var i = 0; i < this.leveldata.length; i++) {
            var ld = this.leveldata[i];
            if (!ld.center) continue;
            var dx = Math.abs(x - ld.center.x), dz = Math.abs(z - ld.center.z);
            if (dx <= ld.half && dz <= ld.half && (ld.holeHalf === 0 || dx >= ld.holeHalf || dz >= ld.holeHalf)) return true;
        }
        return false;
    }
    dispose() {
        for (var i = 0; i < this.leveldata.length; i++) {
            var ld = this.leveldata[i];
            if (ld.mesh) { ld.mesh.geometry.dispose(); this.remove(ld.mesh); ld.mesh = null; }
            ld.center = null;
            ld.dirty = true;
        }
        return this;
    }
}

export { TerrainClipmap };
