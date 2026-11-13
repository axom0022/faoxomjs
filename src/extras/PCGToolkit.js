import { Color } from "../math/index.js";
import { Matrix4 } from "../math/index.js";
import { faoxomclamp, faoxomvalue } from "../math/index.js";
import { Mesh } from "../objects/index.js";
import { InstancedMesh } from "../objects/index.js";
import { StandardMaterial } from "../materials/index.js";
import { faoxomgeometry } from "../geometries/index.js";

class PCGRandom {
    constructor(seed) {
        this.seed = seed === undefined ? 1 : seed | 0;
        this.state = this.seed;
        this.spare = null;
    }
    next() {
        this.state = (this.state + 0x6D2B79F5) | 0;
        var t = this.state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    range(min, max) {
        return min + (max - min) * this.next();
    }
    int(min, max) {
        return min + Math.floor(this.next() * (max - min + 1));
    }
    chance(probability) {
        return this.next() < probability;
    }
    pick(list) {
        return list[Math.floor(this.next() * list.length)];
    }
    gauss(mu, sigma) {
        if (this.spare !== null) {
            var v = this.spare;
            this.spare = null;
            return mu + sigma * v;
        }
        var u = 0, w = 0, s = 0;
        do {
            u = this.next() * 2 - 1;
            w = this.next() * 2 - 1;
            s = u * u + w * w;
        } while (s >= 1 || s === 0);
        var m = Math.sqrt(-2 * Math.log(s) / s);
        this.spare = w * m;
        return mu + sigma * u * m;
    }
    shuffle(list) {
        for (var i = list.length - 1; i > 0; i--) {
            var j = Math.floor(this.next() * (i + 1));
            var tmp = list[i];
            list[i] = list[j];
            list[j] = tmp;
        }
        return list;
    }
}

class PCGNoise {
    constructor(seed) {
        this.seed = seed === undefined ? 1 : seed | 0;
    }
    hash2(ix, iy) {
        var h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(this.seed, 2246822519)) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    }
    value2(x, y) {
        var ix = Math.floor(x), iy = Math.floor(y);
        var fx = x - ix, fy = y - iy;
        var ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
        var uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
        var a = this.hash2(ix, iy);
        var b = this.hash2(ix + 1, iy);
        var c = this.hash2(ix, iy + 1);
        var d = this.hash2(ix + 1, iy + 1);
        var ab = a + (b - a) * ux;
        var cd = c + (d - c) * ux;
        return ab + (cd - ab) * uy;
    }
    fbm2(x, y, options) {
        options = options || {};
        var octaves = options.octaves === undefined ? 4 : Math.max(1, options.octaves | 0);
        var lacunarity = options.lacunarity === undefined ? 2 : options.lacunarity;
        var gain = options.gain === undefined ? 0.5 : options.gain;
        var ridge = !!options.ridge;
        var warp = options.warp === undefined ? 0 : options.warp;
        var xx = x, yy = y;
        if (warp !== 0) {
            xx = x + warp * (this.value2(x + 5.2, y + 1.3) - 0.5);
            yy = y + warp * (this.value2(x - 3.7, y + 9.1) - 0.5);
        }
        var sum = 0, amp = 1, norm = 0, fx = xx, fy = yy;
        for (var o = 0; o < octaves; o++) {
            var v = this.value2(fx, fy);
            if (ridge) v = 1 - Math.abs(2 * v - 1);
            sum += v * amp;
            norm += amp;
            amp *= gain;
            fx *= lacunarity;
            fy *= lacunarity;
        }
        return sum / norm;
    }
}

class PCGTerrain {
    constructor(options) {
        options = options || {};
        this.seed = faoxomvalue(options.seed, 1);
        this.width = faoxomvalue(options.width, 100);
        this.depth = faoxomvalue(options.depth, 100);
        this.segmentsX = Math.max(1, faoxomvalue(options.segmentsX, 64) | 0);
        this.segmentsZ = Math.max(1, faoxomvalue(options.segmentsZ, 64) | 0);
        this.height = faoxomvalue(options.height, 10);
        this.frequency = faoxomvalue(options.frequency, 4);
        this.octaves = faoxomvalue(options.octaves, 5);
        this.lacunarity = faoxomvalue(options.lacunarity, 2);
        this.gain = faoxomvalue(options.gain, 0.5);
        this.ridge = !!options.ridge;
        this.warp = faoxomvalue(options.warp, 0);
        this.flats = options.flats || [];
        this.zones = options.zones || [];
        this.noise = new PCGNoise(this.seed);
        var sx = this.segmentsX, sz = this.segmentsZ;
        var nx = sx + 1, nz = sz + 1;
        this.heights = new Float32Array(nx * nz);
        for (var iz = 0; iz < nz; iz++) {
            for (var ix = 0; ix < nx; ix++) {
                var lx = (ix / sx - 0.5) * this.width;
                var lz = (iz / sz - 0.5) * this.depth;
                var c = this.noise.fbm2((ix / sx) * this.frequency, (iz / sz) * this.frequency, { octaves: this.octaves, lacunarity: this.lacunarity, gain: this.gain, ridge: this.ridge, warp: this.warp });
                var h = c * this.height;
                for (var f = 0; f < this.flats.length; f++) {
                    var flat = this.flats[f];
                    if (!flat || !(flat.radius > 0)) continue;
                    var d = Math.sqrt((lx - flat.x) * (lx - flat.x) + (lz - flat.z) * (lz - flat.z));
                    if (d >= flat.radius) continue;
                    var inner = flat.radius * (1 - faoxomvalue(flat.falloff, 0.25));
                    var w = faoxomclamp((d - inner) / Math.max(flat.radius - inner, 1e-9), 0, 1);
                    w = w * w * (3 - 2 * w);
                    h = flat.height + (h - flat.height) * w;
                }
                this.heights[iz * nx + ix] = h;
            }
        }
        var dx = this.width / sx, dz = this.depth / sz;
        this.normals = new Float32Array(nx * nz * 3);
        this.slopes = new Float32Array(nx * nz);
        for (var z2 = 0; z2 < nz; z2++) {
            for (var x2 = 0; x2 < nx; x2++) {
                var xl = this.heights[z2 * nx + Math.max(x2 - 1, 0)];
                var xr = this.heights[z2 * nx + Math.min(x2 + 1, sx)];
                var zb = this.heights[Math.max(z2 - 1, 0) * nx + x2];
                var zt = this.heights[Math.min(z2 + 1, sz) * nx + x2];
                var stepx = (x2 === 0 || x2 === sx) ? dx : 2 * dx;
                var stepz = (z2 === 0 || z2 === sz) ? dz : 2 * dz;
                var gx = (xr - xl) / stepx;
                var gz = (zt - zb) / stepz;
                var l = Math.sqrt(gx * gx + gz * gz + 1);
                this.normals[(z2 * nx + x2) * 3] = -gx / l;
                this.normals[(z2 * nx + x2) * 3 + 1] = 1 / l;
                this.normals[(z2 * nx + x2) * 3 + 2] = -gz / l;
                this.slopes[z2 * nx + x2] = Math.acos(faoxomclamp(1 / l, -1, 1));
            }
        }
        this.zoneIndices = new Int16Array(nx * nz);
        this.colors = new Float32Array(nx * nz * 3);
        for (var z3 = 0; z3 < nz; z3++) {
            for (var x3 = 0; x3 < nx; x3++) {
                var i = z3 * nx + x3;
                var zi = this.zoneIndexFor(this.heights[i], this.slopes[i]);
                this.zoneIndices[i] = zi;
                var col = this.zoneColor(zi);
                this.colors[i * 3] = col[0];
                this.colors[i * 3 + 1] = col[1];
                this.colors[i * 3 + 2] = col[2];
            }
        }
    }
    zoneIndexFor(h, slope) {
        for (var i = 0; i < this.zones.length; i++) {
            var z = this.zones[i];
            var minh = z.minHeight === undefined ? -Infinity : z.minHeight;
            var maxh = z.maxHeight === undefined ? Infinity : z.maxHeight;
            var maxs = z.maxSlope === undefined ? Infinity : z.maxSlope;
            if (h >= minh && h <= maxh && slope <= maxs) return i;
        }
        return -1;
    }
    zoneColor(zoneIndex) {
        if (zoneIndex < 0 || zoneIndex >= this.zones.length) return [1, 1, 1];
        var c = this.zones[zoneIndex].color;
        if (c === undefined) return [1, 1, 1];
        if (typeof c === "number") {
            var col = new Color(c);
            return [col.r, col.g, col.b];
        }
        if (c && c.r !== undefined) return [c.r, c.g === undefined ? c.r : c.g, c.b === undefined ? c.r : c.b];
        if (c && c.length >= 3) return [c[0], c[1], c[2]];
        return [1, 1, 1];
    }
    zoneIndexByName(name) {
        for (var i = 0; i < this.zones.length; i++) if (this.zones[i].name === name) return i;
        return -1;
    }
    gridX(wx) {
        return faoxomclamp(wx / this.width + 0.5, 0, 1) * this.segmentsX;
    }
    gridZ(wz) {
        return faoxomclamp(wz / this.depth + 0.5, 0, 1) * this.segmentsZ;
    }
    bilinear(array, fx, fz) {
        var nx = this.segmentsX + 1;
        var x0 = Math.min(this.segmentsX, Math.floor(fx));
        var z0 = Math.min(this.segmentsZ, Math.floor(fz));
        var x1 = Math.min(this.segmentsX, x0 + 1);
        var z1 = Math.min(this.segmentsZ, z0 + 1);
        var tx = fx - x0;
        var tz = fz - z0;
        var a = array[z0 * nx + x0];
        var b = array[z0 * nx + x1];
        var c = array[z1 * nx + x0];
        var d = array[z1 * nx + x1];
        var ab = a + (b - a) * tx;
        var cd = c + (d - c) * tx;
        return ab + (cd - ab) * tz;
    }
    heightAt(wx, wz) {
        return this.bilinear(this.heights, this.gridX(wx), this.gridZ(wz));
    }
    slopeAt(wx, wz) {
        return this.bilinear(this.slopes, this.gridX(wx), this.gridZ(wz));
    }
    zoneAt(wx, wz) {
        var ix = Math.round(this.gridX(wx));
        var iz = Math.round(this.gridZ(wz));
        ix = faoxomclamp(ix, 0, this.segmentsX);
        iz = faoxomclamp(iz, 0, this.segmentsZ);
        return this.zoneIndices[iz * (this.segmentsX + 1) + ix];
    }
    toMesh(material) {
        var sx = this.segmentsX, sz = this.segmentsZ;
        var nx = sx + 1;
        var p = [], n = [], u = [], ind = [];
        for (var iz = 0; iz <= sz; iz++) {
            for (var ix = 0; ix <= sx; ix++) {
                var i = iz * nx + ix;
                p.push((ix / sx - 0.5) * this.width, this.heights[i], (iz / sz - 0.5) * this.depth);
                n.push(this.normals[i * 3], this.normals[i * 3 + 1], this.normals[i * 3 + 2]);
                u.push(ix / sx, iz / sz);
            }
        }
        for (var zz = 0; zz < sz; zz++) {
            for (var xx = 0; xx < sx; xx++) {
                var a = zz * nx + xx;
                var b = a + 1;
                var c = a + nx;
                var d = c + 1;
                ind.push(a, c, b, b, c, d);
            }
        }
        var g = faoxomgeometry(p, n, u, ind);
        g.setAttribute("color", this.colors, 3);
        return new Mesh(g, material || new StandardMaterial());
    }
}

class PCGScatter {
    constructor(source) {
        this.source = source;
        this.transforms = [];
        if (source && source.bounds) {
            this.bounds = source.bounds;
        } else if (source && source.width !== undefined && source.depth !== undefined) {
            this.bounds = { minX: -source.width * 0.5, maxX: source.width * 0.5, minZ: -source.depth * 0.5, maxZ: source.depth * 0.5 };
        } else {
            this.bounds = { minX: -50, maxX: 50, minZ: -50, maxZ: 50 };
        }
    }
    satisfies(x, z, rules) {
        var h = this.source.heightAt(x, z);
        var slope = this.source.slopeAt(x, z);
        var zone = this.source.zoneAt ? this.source.zoneAt(x, z) : 0;
        var minh = rules.minHeight === undefined ? -Infinity : rules.minHeight;
        var maxh = rules.maxHeight === undefined ? Infinity : rules.maxHeight;
        var mins = rules.minSlope === undefined ? 0 : rules.minSlope;
        var maxs = rules.maxSlope === undefined ? Infinity : rules.maxSlope;
        if (h < minh || h > maxh) return false;
        if (slope < mins || slope > maxs) return false;
        if (rules.zones && rules.zones.length && rules.zones.indexOf(zone) < 0) return false;
        return true;
    }
    scatter(rules) {
        rules = rules || {};
        var count = Math.max(0, faoxomvalue(rules.count, 16) | 0);
        var mode = rules.mode === "poisson" ? "poisson" : "jitter";
        var rng = new PCGRandom(faoxomvalue(rules.seed, 1));
        var rotation = rules.rotation !== false;
        var scaleMin = faoxomvalue(rules.scaleMin, 1);
        var scaleMax = rules.scaleMax === undefined ? scaleMin : rules.scaleMax;
        var yOffset = faoxomvalue(rules.yOffset, 0);
        this.transforms = [];
        var self = this;
        function push(x, z) {
            var h = self.source.heightAt(x, z) + yOffset;
            var rot = rotation ? rng.range(0, Math.PI * 2) : 0;
            var sc = rng.range(scaleMin, scaleMax);
            self.transforms.push({ position: [x, h, z], rotationY: rot, scale: sc });
        }
        if (mode === "jitter") {
            var maxAttempts = faoxomvalue(rules.maxAttempts, count * 30);
            var attempts = 0;
            while (this.transforms.length < count && attempts < maxAttempts) {
                attempts++;
                var x = rng.range(this.bounds.minX, this.bounds.maxX);
                var z = rng.range(this.bounds.minZ, this.bounds.maxZ);
                if (!this.satisfies(x, z, rules)) continue;
                push(x, z);
            }
        } else {
            var radius = Math.max(0.0001, faoxomvalue(rules.radius, 1));
            var cell = radius / 1.4142135623730951;
            var gw = Math.max(1, Math.ceil((this.bounds.maxX - this.bounds.minX) / cell));
            var gh = Math.max(1, Math.ceil((this.bounds.maxZ - this.bounds.minZ) / cell));
            var grid = new Int32Array(gw * gh).fill(-1);
            var points = [];
            var active = [];
            var tries = faoxomvalue(rules.tries, 30);
            var startAttempts = 0;
            while (points.length === 0 && startAttempts < faoxomvalue(rules.maxAttempts, 100)) {
                startAttempts++;
                var sx = rng.range(this.bounds.minX, this.bounds.maxX);
                var sz = rng.range(this.bounds.minZ, this.bounds.maxZ);
                if (!this.satisfies(sx, sz, rules)) continue;
                points.push([sx, sz]);
                grid[Math.min(gh - 1, Math.floor((sz - this.bounds.minZ) / cell)) * gw + Math.min(gw - 1, Math.floor((sx - this.bounds.minX) / cell))] = 0;
                active.push(0);
            }
            while (active.length > 0 && points.length < count) {
                var ai = rng.int(0, active.length - 1);
                var base = points[active[ai]];
                var placed = false;
                for (var t = 0; t < tries && points.length < count; t++) {
                    var ang = rng.range(0, Math.PI * 2);
                    var dist = rng.range(radius, 2 * radius);
                    var cx = base[0] + Math.cos(ang) * dist;
                    var cz = base[1] + Math.sin(ang) * dist;
                    if (cx < this.bounds.minX || cx > this.bounds.maxX || cz < this.bounds.minZ || cz > this.bounds.maxZ) continue;
                    if (!this.satisfies(cx, cz, rules)) continue;
                    var gx = Math.min(gw - 1, Math.floor((cx - this.bounds.minX) / cell));
                    var gz = Math.min(gh - 1, Math.floor((cz - this.bounds.minZ) / cell));
                    var ok = true;
                    for (var oz = Math.max(0, gz - 2); oz <= Math.min(gh - 1, gz + 2) && ok; oz++) {
                        for (var ox = Math.max(0, gx - 2); ox <= Math.min(gw - 1, gx + 2); ox++) {
                            var pi = grid[oz * gw + ox];
                            if (pi < 0) continue;
                            var dx = points[pi][0] - cx;
                            var dz = points[pi][1] - cz;
                            if (dx * dx + dz * dz < radius * radius) { ok = false; break; }
                        }
                    }
                    if (!ok) continue;
                    points.push([cx, cz]);
                    grid[gz * gw + gx] = points.length - 1;
                    active.push(points.length - 1);
                    placed = true;
                }
                if (!placed) {
                    active[ai] = active[active.length - 1];
                    active.pop();
                }
            }
            for (var pI = 0; pI < points.length; pI++) push(points[pI][0], points[pI][1]);
        }
        return this.transforms;
    }
    matrices() {
        var out = [];
        var t = new Matrix4(), r = new Matrix4(), s = new Matrix4(), m = new Matrix4();
        for (var i = 0; i < this.transforms.length; i++) {
            var tr = this.transforms[i];
            t.makeTranslation(tr.position[0], tr.position[1], tr.position[2]);
            r.makeRotationY(tr.rotationY);
            s.makeScale(tr.scale, tr.scale, tr.scale);
            m.multiplyMatrices(t, r).multiply(s);
            out.push(m.clone());
            m.identity();
        }
        return out;
    }
    toInstancedMesh(geometry, material) {
        var mesh = new InstancedMesh(geometry, material, this.transforms.length);
        var mats = this.matrices();
        for (var i = 0; i < mats.length; i++) mesh.setMatrixAt(i, mats[i]);
        return mesh;
    }
}

class PCGDungeon {
    constructor(options) {
        options = options || {};
        this.seed = faoxomvalue(options.seed, 1);
        this.cols = Math.max(8, faoxomvalue(options.cols, 48) | 0);
        this.rows = Math.max(8, faoxomvalue(options.rows, 48) | 0);
        this.attempts = Math.max(1, faoxomvalue(options.attempts, 12) | 0);
        this.roomMin = Math.max(2, faoxomvalue(options.roomMin, 4) | 0);
        this.roomMax = Math.max(this.roomMin, faoxomvalue(options.roomMax, 9) | 0);
        this.rooms = [];
        this.corridors = [];
        this.doors = [];
        this.tiles = new Uint8Array(this.cols * this.rows);
        this.generate();
    }
    tileAt(x, z) {
        if (x < 0 || z < 0 || x >= this.cols || z >= this.rows) return 0;
        return this.tiles[z * this.cols + x];
    }
    carveRect(x, z, w, h) {
        for (var iz = z; iz < z + h; iz++) {
            for (var ix = x; ix < x + w; ix++) {
                if (ix >= 0 && iz >= 0 && ix < this.cols && iz < this.rows) this.tiles[iz * this.cols + ix] = 1;
            }
        }
    }
    carveLine(x1, z1, x2, z2) {
        var x = x1;
        var z = z1;
        var stepX = x2 >= x1 ? 1 : -1;
        var stepZ = z2 >= z1 ? 1 : -1;
        while (x !== x2) {
            x += stepX;
            if (x >= 0 && z >= 0 && x < this.cols && z < this.rows) this.tiles[z * this.cols + x] = 1;
        }
        while (z !== z2) {
            z += stepZ;
            if (x >= 0 && z >= 0 && x < this.cols && z < this.rows) this.tiles[z * this.cols + x] = 1;
        }
    }
    generate() {
        var rng = new PCGRandom(this.seed);
        var maxRoom = Math.min(this.roomMax, Math.min(this.cols, this.rows) - 3);
        if (maxRoom < this.roomMin) maxRoom = this.roomMin;
        for (var a = 0; a < this.attempts; a++) {
            var w = rng.int(this.roomMin, maxRoom);
            var h = rng.int(this.roomMin, maxRoom);
            var x = rng.int(1, Math.max(1, this.cols - w - 2));
            var z = rng.int(1, Math.max(1, this.rows - h - 2));
            var overlap = false;
            for (var r = 0; r < this.rooms.length; r++) {
                var rr = this.rooms[r];
                if (x < rr.x + rr.w + 1 && x + w + 1 > rr.x && z < rr.z + rr.h + 1 && z + h + 1 > rr.z) { overlap = true; break; }
            }
            if (overlap) continue;
            this.rooms.push({ x: x, z: z, w: w, h: h, cx: x + Math.floor(w / 2), cz: z + Math.floor(h / 2) });
            this.carveRect(x, z, w, h);
        }
        for (var i = 1; i < this.rooms.length; i++) {
            var from = this.rooms[i - 1];
            var to = this.rooms[i];
            var horizFirst = rng.chance(0.5);
            if (horizFirst) {
                this.carveLine(from.cx, from.cz, to.cx, from.cz);
                this.carveLine(to.cx, from.cz, to.cx, to.cz);
            } else {
                this.carveLine(from.cx, from.cz, from.cx, to.cz);
                this.carveLine(from.cx, to.cz, to.cx, to.cz);
            }
            this.corridors.push({ x1: from.cx, z1: from.cz, x2: to.cx, z2: to.cz, order: horizFirst ? "hz" : "vh" });
        }
        for (var ri = 0; ri < this.rooms.length; ri++) {
            var room = this.rooms[ri];
            for (var pz = room.z - 1; pz <= room.z + room.h; pz++) {
                for (var px = room.x - 1; px <= room.x + room.w; px++) {
                    var onRing = px === room.x - 1 || px === room.x + room.w || pz === room.z - 1 || pz === room.z + room.h;
                    if (!onRing) continue;
                    if (this.tileAt(px, pz) !== 1) continue;
                    var adjacent = false;
                    if (px >= room.x && px < room.x + room.w && pz === room.z - 1 && this.tileAt(px, room.z) === 1) adjacent = true;
                    if (px >= room.x && px < room.x + room.w && pz === room.z + room.h && this.tileAt(px, room.z + room.h - 1) === 1) adjacent = true;
                    if (pz >= room.z && pz < room.z + room.h && px === room.x - 1 && this.tileAt(room.x, pz) === 1) adjacent = true;
                    if (pz >= room.z && pz < room.z + room.h && px === room.x + room.w && this.tileAt(room.x + room.w - 1, pz) === 1) adjacent = true;
                    if (adjacent) this.doors.push({ x: px, z: pz, room: ri });
                }
            }
        }
        return this;
    }
    connected() {
        if (this.rooms.length === 0) return true;
        var start = this.rooms[0];
        var visited = new Uint8Array(this.cols * this.rows);
        var queue = [start.cz * this.cols + start.cx];
        visited[queue[0]] = 1;
        var head = 0;
        while (head < queue.length) {
            var i = queue[head++];
            var x = i % this.cols;
            var z = (i - x) / this.cols;
            var neighbors = [i - 1, i + 1, i - this.cols, i + this.cols];
            if (x === 0) neighbors[0] = -1;
            if (x === this.cols - 1) neighbors[1] = -1;
            if (z === 0) neighbors[2] = -1;
            if (z === this.rows - 1) neighbors[3] = -1;
            for (var n = 0; n < 4; n++) {
                var j = neighbors[n];
                if (j < 0 || visited[j] || this.tiles[j] !== 1) continue;
                visited[j] = 1;
                queue.push(j);
            }
        }
        for (var r = 0; r < this.rooms.length; r++) {
            if (!visited[this.rooms[r].cz * this.cols + this.rooms[r].cx]) return false;
        }
        return true;
    }
    toMeshes(options) {
        options = options || {};
        var tile = faoxomvalue(options.tile, 1);
        var wallHeight = faoxomvalue(options.wallHeight, 2.5);
        var originX = faoxomvalue(options.originX, 0);
        var originZ = faoxomvalue(options.originZ, 0);
        function wx(x) { return originX + (x - 0.5) * tile; }
        function wz(z) { return originZ + (z - 0.5) * tile; }
        var fp = [], fn = [], fu = [], fi = [];
        var wp = [], wn = [], wu = [], wi = [];
        var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (var z = 0; z < this.rows; z++) {
            for (var x = 0; x < this.cols; x++) {
                if (this.tiles[z * this.cols + x] === 1) {
                    var fb = fp.length / 3;
                    fp.push(wx(x) - tile * 0.5, 0, wz(z) - tile * 0.5);
                    fp.push(wx(x) + tile * 0.5, 0, wz(z) - tile * 0.5);
                    fp.push(wx(x) - tile * 0.5, 0, wz(z) + tile * 0.5);
                    fp.push(wx(x) + tile * 0.5, 0, wz(z) + tile * 0.5);
                    fn.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
                    fu.push(0, 0, 1, 0, 1, 0, 0, 1, 1, 1);
                    fi.push(fb, fb + 2, fb + 1, fb + 1, fb + 2, fb + 3);
                } else {
                    for (var d = 0; d < 4; d++) {
                        var nx2 = x + dirs[d][0];
                        var nz2 = z + dirs[d][1];
                        if (this.tileAt(nx2, nz2) !== 1) continue;
                        var wb = wp.length / 3;
                        var x0 = wx(x) - tile * 0.5;
                        var x1 = wx(x) + tile * 0.5;
                        var z0 = wz(z) - tile * 0.5;
                        var z1 = wz(z) + tile * 0.5;
                        var quad = null;
                        if (dirs[d][0] === 1) quad = [[x1, 0, z0], [x1, 0, z1], [x1, wallHeight, z0], [x1, wallHeight, z1], [1, 0, 0]];
                        else if (dirs[d][0] === -1) quad = [[x0, 0, z1], [x0, 0, z0], [x0, wallHeight, z1], [x0, wallHeight, z0], [-1, 0, 0]];
                        else if (dirs[d][1] === 1) quad = [[x1, 0, z1], [x0, 0, z1], [x1, wallHeight, z1], [x0, wallHeight, z1], [0, 0, 1]];
                        else quad = [[x0, 0, z0], [x1, 0, z0], [x0, wallHeight, z0], [x1, wallHeight, z0], [0, 0, -1]];
                        for (var v = 0; v < 4; v++) {
                            wp.push(quad[v][0], quad[v][1], quad[v][2]);
                            wn.push(quad[4][0], quad[4][1], quad[4][2]);
                        }
                        wu.push(0, 0, 1, 0, 1, 1, 1, 1);
                        wi.push(wb, wb + 2, wb + 1, wb + 1, wb + 2, wb + 3);
                    }
                }
            }
        }
        var floorMesh = new Mesh(faoxomgeometry(fp, fn, fu, fi), options.floorMaterial || new StandardMaterial());
        var wallMesh = new Mesh(faoxomgeometry(wp, wn, wu, wi), options.wallMaterial || new StandardMaterial());
        return { floor: floorMesh, walls: wallMesh, floorTriangles: fi.length / 3, wallTriangles: wi.length / 3 };
    }
}

class PCGGrammar {
    constructor() {}
    expand(axiom, rules, iterations) {
        var s = String(axiom === undefined ? "" : axiom);
        rules = rules || {};
        var n = Math.max(0, faoxomvalue(iterations, 0) | 0);
        for (var i = 0; i < n; i++) {
            var out = "";
            for (var c = 0; c < s.length; c++) {
                var ch = s.charAt(c);
                var r = rules[ch];
                out += r === undefined ? ch : r;
            }
            s = out;
        }
        return s;
    }
    turtle(str, options) {
        options = options || {};
        var step = faoxomvalue(options.step, 1);
        var angle = faoxomvalue(options.angle, Math.PI / 2);
        var x = faoxomvalue(options.x, 0);
        var z = faoxomvalue(options.z, 0);
        var dir = faoxomvalue(options.dir, 0);
        var stack = [];
        var segments = [];
        var transforms = [];
        var s = String(str === undefined ? "" : str);
        for (var i = 0; i < s.length; i++) {
            var ch = s.charAt(i);
            if (ch === "F") {
                var nx = x + Math.cos(dir) * step;
                var nz = z + Math.sin(dir) * step;
                segments.push({ from: [x, z], to: [nx, nz] });
                transforms.push({ position: [(x + nx) * 0.5, 0, (z + nz) * 0.5], rotationY: -dir, scale: 1 });
                x = nx;
                z = nz;
            } else if (ch === "+") {
                dir += angle;
            } else if (ch === "-") {
                dir -= angle;
            } else if (ch === "[") {
                stack.push({ x: x, z: z, dir: dir });
            } else if (ch === "]") {
                var st = stack.pop();
                if (st) {
                    x = st.x;
                    z = st.z;
                    dir = st.dir;
                }
            }
        }
        return { segments: segments, transforms: transforms, end: { x: x, z: z, dir: dir } };
    }
}

export { PCGRandom, PCGNoise, PCGTerrain, PCGScatter, PCGDungeon, PCGGrammar };
