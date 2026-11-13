import { Object3D, DoubleSide } from "../core/index.js";
import { Vector3, faoxomvalue } from "../math/index.js";
import { Geometry } from "../geometries/index.js";
import { Mesh } from "../objects/index.js";
import { BasicMaterial } from "../materials/index.js";
import { PerspectiveCamera } from "../camera/index.js";
import { Scene } from "../scenes/index.js";
import { DataTexture } from "../textures/index.js";

var bayer8 = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21]
];

function ditherThreshold(x, y) {
    return bayer8[((y % 8) + 8) % 8][((x % 8) + 8) % 8];
}

function ditheredOpacity(progress) {
    var p = faoxomvalue(progress, 0);
    if (!(p > 0)) return 0;
    if (p >= 1) return 1;
    var level = p * 64;
    var count = 0;
    for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) if (bayer8[y][x] < level) count++;
    return count / 64;
}

function entryLess(a, b) { return a.e < b.e || (a.e === b.e && a.s < b.s); }

function heapPush(heap, entry) {
    heap.push(entry);
    var i = heap.length - 1;
    while (i > 0) {
        var p = (i - 1) >> 1;
        if (entryLess(heap[p], entry)) break;
        heap[i] = heap[p];
        i = p;
    }
    heap[i] = entry;
}

function heapPop(heap) {
    var top = heap[0];
    var last = heap.pop();
    if (heap.length > 0) {
        heap[0] = last;
        var i = 0;
        for (;;) {
            var l = i * 2 + 1, r = l + 1, best = i;
            if (l < heap.length && entryLess(heap[l], heap[best])) best = l;
            if (r < heap.length && entryLess(heap[r], heap[best])) best = r;
            if (best === i) break;
            var swap = heap[i]; heap[i] = heap[best]; heap[best] = swap;
            i = best;
        }
    }
    return top;
}

function quadricErrorAt(q, base, x, y, z) {
    var a = q[base], b = q[base + 1], c = q[base + 2], d = q[base + 3];
    var e = q[base + 4], f = q[base + 5], g = q[base + 6], h = q[base + 7];
    var i = q[base + 8], j = q[base + 9];
    return a * x * x + 2 * b * x * y + 2 * c * x * z + 2 * d * x + e * y * y + 2 * f * y * z + 2 * g * y + h * z * z + 2 * i * z + j;
}

function quadricSolve(q, base, ax, ay, az, bx, by, bz) {
    var a = q[base], b = q[base + 1], c = q[base + 2], d = q[base + 3];
    var e = q[base + 4], f = q[base + 5], g = q[base + 6];
    var h = q[base + 7], i = q[base + 8];
    var r0 = -d, r1 = -g, r2 = -i;
    var det = a * (e * h - f * f) - b * (b * h - f * c) + c * (b * f - e * c);
    var candidates = [];
    if (Math.abs(det) > 1e-12) {
        var x = (r0 * (e * h - f * f) - b * (r1 * h - f * r2) + c * (r1 * f - e * r2)) / det;
        var y = (a * (r1 * h - f * r2) - r0 * (b * h - f * c) + c * (b * r2 - r1 * c)) / det;
        var z = (a * (e * r2 - r1 * f) - b * (b * r2 - r1 * c) + r0 * (b * f - e * c)) / det;
        if (isFinite(x) && isFinite(y) && isFinite(z)) candidates.push([x, y, z]);
    }
    candidates.push([(ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5]);
    candidates.push([ax, ay, az]);
    candidates.push([bx, by, bz]);
    var best = null, bestError = Infinity;
    for (var ci = 0; ci < candidates.length; ci++) {
        var err = quadricErrorAt(q, base, candidates[ci][0], candidates[ci][1], candidates[ci][2]);
        if (err < bestError) { bestError = err; best = candidates[ci]; }
    }
    return { x: best[0], y: best[1], z: best[2], error: Math.max(0, bestError) };
}

function simplifyQuadric(geometry, options) {
    options = options || {};
    var position = geometry && geometry.attributes ? geometry.attributes.position : null;
    if (!position || !position.array) throw new Error("simplifyQuadric requires a geometry with a position attribute");
    var ratio = options.targetRatio;
    var target = options.targetTriangles;
    if (ratio === undefined && target === undefined) ratio = 0.5;
    if (ratio !== undefined && (typeof ratio !== "number" || !isFinite(ratio) || ratio <= 0 || ratio > 1)) throw new Error("simplifyQuadric targetRatio must be a number in (0, 1]");
    if (target !== undefined && (typeof target !== "number" || !isFinite(target) || Math.floor(target) !== target || target < 1)) throw new Error("simplifyQuadric targetTriangles must be an integer of at least 1");
    var lockBoundary = options.lockBoundary === true;
    var itemSize = position.itemSize || 3;
    var vertexCount = Math.floor(position.array.length / itemSize);
    if (vertexCount < 3) throw new Error("simplifyQuadric requires at least 3 vertices");
    var sourceIndex = geometry.index || null;
    var triangleCount = Math.floor((sourceIndex ? sourceIndex.length : vertexCount) / 3);
    if (target === undefined) target = Math.max(1, Math.floor(triangleCount * ratio));
    if (triangleCount <= target) {
        var cloned = geometry.clone();
        cloned.userData = cloned.userData || {};
        cloned.userData.simplifyError = 0;
        cloned.userData.simplifyTriangles = triangleCount;
        return cloned;
    }
    var px = new Float64Array(vertexCount), py = new Float64Array(vertexCount), pz = new Float64Array(vertexCount);
    for (var vi = 0; vi < vertexCount; vi++) {
        px[vi] = position.array[vi * itemSize];
        py[vi] = position.array[vi * itemSize + 1];
        pz[vi] = position.array[vi * itemSize + 2];
    }
    var remap = new Int32Array(vertexCount);
    for (var ri = 0; ri < vertexCount; ri++) remap[ri] = ri;
    function find(v) { while (remap[v] !== v) { remap[v] = remap[remap[v]]; v = remap[v]; } return v; }
    var triA = new Int32Array(triangleCount), triB = new Int32Array(triangleCount), triC = new Int32Array(triangleCount);
    var triAlive = new Uint8Array(triangleCount);
    var liveTriangles = 0;
    for (var ti = 0; ti < triangleCount; ti++) {
        var ia = sourceIndex ? sourceIndex[ti * 3] : ti * 3;
        var ib = sourceIndex ? sourceIndex[ti * 3 + 1] : ti * 3 + 1;
        var ic = sourceIndex ? sourceIndex[ti * 3 + 2] : ti * 3 + 2;
        triA[ti] = find(ia); triB[ti] = find(ib); triC[ti] = find(ic);
        if (triA[ti] === triB[ti] || triB[ti] === triC[ti] || triA[ti] === triC[ti]) { triAlive[ti] = 0; continue; }
        triAlive[ti] = 1;
        liveTriangles++;
    }
    var quadrics = new Float64Array(vertexCount * 10);
    var vertexTris = new Array(vertexCount);
    for (var adj = 0; adj < vertexCount; adj++) vertexTris[adj] = [];
    for (var qti = 0; qti < triangleCount; qti++) {
        if (!triAlive[qti]) continue;
        var qa = triA[qti], qb = triB[qti], qc = triC[qti];
        var e1x = px[qb] - px[qa], e1y = py[qb] - py[qa], e1z = pz[qb] - pz[qa];
        var e2x = px[qc] - px[qa], e2y = py[qc] - py[qa], e2z = pz[qc] - pz[qa];
        var nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
        var len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (len < 1e-12) continue;
        nx /= len; ny /= len; nz /= len;
        var dd = -(nx * px[qa] + ny * py[qa] + nz * pz[qa]);
        var corners = [qa, qb, qc];
        for (var ci = 0; ci < 3; ci++) {
            var base = corners[ci] * 10;
            quadrics[base] += nx * nx;
            quadrics[base + 1] += nx * ny;
            quadrics[base + 2] += nx * nz;
            quadrics[base + 3] += nx * dd;
            quadrics[base + 4] += ny * ny;
            quadrics[base + 5] += ny * nz;
            quadrics[base + 6] += ny * dd;
            quadrics[base + 7] += nz * nz;
            quadrics[base + 8] += nz * dd;
            quadrics[base + 9] += dd * dd;
        }
        vertexTris[qa].push(qti);
        vertexTris[qb].push(qti);
        vertexTris[qc].push(qti);
    }
    var boundary = null;
    if (lockBoundary) {
        boundary = new Uint8Array(vertexCount);
        var edgeCount = {};
        for (var bt = 0; bt < triangleCount; bt++) {
            if (!triAlive[bt]) continue;
            var pairs = [[triA[bt], triB[bt]], [triB[bt], triC[bt]], [triA[bt], triC[bt]]];
            for (var bp = 0; bp < 3; bp++) {
                var lo = Math.min(pairs[bp][0], pairs[bp][1]), hi = Math.max(pairs[bp][0], pairs[bp][1]);
                var key = lo + "_" + hi;
                edgeCount[key] = (edgeCount[key] || 0) + 1;
            }
        }
        for (var bk in edgeCount) {
            if (edgeCount[bk] !== 1) continue;
            var parts = bk.split("_");
            boundary[parseInt(parts[0], 10)] = 1;
            boundary[parseInt(parts[1], 10)] = 1;
        }
    }
    var heap = [];
    var seqCounter = 0;
    function pushEdge(a, b) {
        if (a === b) return;
        if (boundary && (boundary[a] || boundary[b])) return;
        var merged = new Float64Array(10);
        for (var mi = 0; mi < 10; mi++) merged[mi] = quadrics[a * 10 + mi] + quadrics[b * 10 + mi];
        var solved = quadricSolve(merged, 0, px[a], py[a], pz[a], px[b], py[b], pz[b]);
        heapPush(heap, { e: solved.error, a: a, b: b, x: solved.x, y: solved.y, z: solved.z, s: seqCounter++ });
    }
    var seenEdges = {};
    for (var it = 0; it < triangleCount; it++) {
        if (!triAlive[it]) continue;
        var epairs = [[triA[it], triB[it]], [triB[it], triC[it]], [triA[it], triC[it]]];
        for (var ep = 0; ep < 3; ep++) {
            var elo = Math.min(epairs[ep][0], epairs[ep][1]), ehi = Math.max(epairs[ep][0], epairs[ep][1]);
            var ekey = elo + "_" + ehi;
            if (seenEdges[ekey]) continue;
            seenEdges[ekey] = true;
            pushEdge(elo, ehi);
        }
    }
    function edgeExists(a, b) {
        var list = vertexTris[a].length <= vertexTris[b].length ? vertexTris[a] : vertexTris[b];
        var other = list === vertexTris[a] ? b : a;
        for (var li = 0; li < list.length; li++) {
            var t = list[li];
            if (!triAlive[t]) continue;
            if ((triA[t] === other || triB[t] === other || triC[t] === other) && (triA[t] === a || triB[t] === a || triC[t] === a)) return true;
        }
        return false;
    }
    var maxError = 0;
    var guard = 0;
    while (liveTriangles > target && heap.length > 0 && guard++ < triangleCount * 40) {
        var entry = heapPop(heap);
        var a = find(entry.a), b = find(entry.b);
        if (a === b || a >= vertexCount || b >= vertexCount) continue;
        if (boundary && (boundary[a] || boundary[b])) continue;
        if (!edgeExists(a, b)) continue;
        var mergedNow = new Float64Array(10);
        for (var mi2 = 0; mi2 < 10; mi2++) mergedNow[mi2] = quadrics[a * 10 + mi2] + quadrics[b * 10 + mi2];
        var solvedNow = quadricSolve(mergedNow, 0, px[a], py[a], pz[a], px[b], py[b], pz[b]);
        if (solvedNow.error > entry.e * 1.000001 + 1e-12) {
            heapPush(heap, { e: solvedNow.error, a: a, b: b, x: solvedNow.x, y: solvedNow.y, z: solvedNow.z, s: seqCounter++ });
            continue;
        }
        if (solvedNow.error > maxError) maxError = solvedNow.error;
        for (var qi = 0; qi < 10; qi++) quadrics[a * 10 + qi] = mergedNow[qi];
        px[a] = solvedNow.x; py[a] = solvedNow.y; pz[a] = solvedNow.z;
        var movedTris = vertexTris[b];
        for (var mt = 0; mt < movedTris.length; mt++) {
            var t2 = movedTris[mt];
            if (!triAlive[t2]) continue;
            if (triA[t2] === b) triA[t2] = a;
            if (triB[t2] === b) triB[t2] = a;
            if (triC[t2] === b) triC[t2] = a;
            if (triA[t2] === triB[t2] || triB[t2] === triC[t2] || triA[t2] === triC[t2]) { triAlive[t2] = 0; liveTriangles--; continue; }
            vertexTris[a].push(t2);
        }
        vertexTris[b] = [];
        remap[b] = a;
        var neighbors = {};
        var aTris = vertexTris[a];
        for (var at = 0; at < aTris.length; at++) {
            var t3 = aTris[at];
            if (!triAlive[t3]) continue;
            neighbors[triA[t3]] = 1; neighbors[triB[t3]] = 1; neighbors[triC[t3]] = 1;
        }
        for (var nk in neighbors) pushEdge(a, parseInt(nk, 10));
    }
    var oldToNew = new Int32Array(vertexCount);
    for (var oi = 0; oi < vertexCount; oi++) oldToNew[oi] = -1;
    var used = [];
    var outIndices = [];
    for (var ft = 0; ft < triangleCount; ft++) {
        if (!triAlive[ft]) continue;
        var fa = find(triA[ft]), fb = find(triB[ft]), fc = find(triC[ft]);
        if (fa === fb || fb === fc || fa === fc) continue;
        if (oldToNew[fa] === -1) { oldToNew[fa] = used.length; used.push(fa); }
        if (oldToNew[fb] === -1) { oldToNew[fb] = used.length; used.push(fb); }
        if (oldToNew[fc] === -1) { oldToNew[fc] = used.length; used.push(fc); }
        outIndices.push(oldToNew[fa], oldToNew[fb], oldToNew[fc]);
    }
    var out = new Geometry();
    for (var name in geometry.attributes) {
        var source = geometry.attributes[name];
        var size = source.itemSize || 1;
        var outArray = new source.array.constructor(used.length * size);
        for (var ui = 0; ui < used.length; ui++) {
            var survivor = used[ui];
            if (name === "position") {
                outArray[ui * size] = px[survivor];
                if (size > 1) outArray[ui * size + 1] = py[survivor];
                if (size > 2) outArray[ui * size + 2] = pz[survivor];
            } else {
                for (var oc = 0; oc < size && oc < 3; oc++) outArray[ui * size + oc] = source.array[survivor * size + oc];
            }
        }
        out.setAttribute(name, outArray, size, !!source.normalized);
    }
    out.setIndex(used.length > 65535 ? new Uint32Array(outIndices) : new Uint16Array(outIndices));
    if (out.attributes.normal) out.computeVertexNormals();
    out.computeBounds();
    out.userData = { simplifyError: maxError, simplifyTriangles: outIndices.length / 3 };
    return out;
}
Geometry.prototype.simplifyQuadric = function (options) { return simplifyQuadric(this, options); };

class AutomaticLOD extends Object3D {
    constructor(mesh, options) {
        super();
        options = options || {};
        if (!mesh || !mesh.geometry || !mesh.geometry.attributes || !mesh.geometry.attributes.position) throw new Error("AutomaticLOD requires a mesh with a positioned geometry");
        this.type = "AutomaticLOD";
        this.mesh = mesh;
        var schedule = options.schedule === undefined ? null : options.schedule;
        if (schedule !== null) {
            if (!Array.isArray(schedule) || schedule.length === 0) throw new Error("AutomaticLOD schedule must be a non-empty array of {ratio, distance}");
            for (var i = 0; i < schedule.length; i++) {
                var entry = schedule[i];
                if (!entry || typeof entry !== "object") throw new Error("AutomaticLOD schedule entries must be objects with ratio and distance");
                if (entry.ratio !== undefined && (typeof entry.ratio !== "number" || !isFinite(entry.ratio) || entry.ratio <= 0 || entry.ratio > 1)) throw new Error("AutomaticLOD schedule ratio must be a number in (0, 1]");
                if (typeof entry.distance !== "number" || !isFinite(entry.distance) || entry.distance < 0) throw new Error("AutomaticLOD schedule distance must be a non-negative finite number");
                if (i > 0 && !(entry.distance > schedule[i - 1].distance)) throw new Error("AutomaticLOD schedule distances must be strictly increasing");
            }
        }
        this.scheduleOption = schedule;
        var fadeFrames = options.fadeFrames === undefined ? 8 : options.fadeFrames;
        if (typeof fadeFrames !== "number" || !isFinite(fadeFrames) || Math.floor(fadeFrames) !== fadeFrames || fadeFrames < 1) throw new Error("AutomaticLOD fadeFrames must be an integer of at least 1");
        this.fadeFrames = fadeFrames;
        var hysteresis = options.hysteresis === undefined ? 0.05 : options.hysteresis;
        if (typeof hysteresis !== "number" || !isFinite(hysteresis) || hysteresis < 0) throw new Error("AutomaticLOD hysteresis must be a non-negative finite number");
        this.hysteresis = hysteresis;
        this.lockBoundary = options.lockBoundary === true;
        this.levels = [];
        this.chain = [];
        this.activeLevel = -1;
        this.fade = { active: false, from: -1, to: -1, progress: 0 };
        this.impostor = null;
        this.billboard = null;
        this.boundRadius = 1;
        this.boundCenter = new Vector3();
        this.counters = { switches: 0, frames: 0 };
    }
    radius() {
        var geometry = this.mesh.geometry;
        if (!geometry.boundingSphere) geometry.computeBounds();
        var sphere = geometry.boundingSphere;
        this.boundRadius = sphere && typeof sphere.radius === "number" && sphere.radius > 0 ? sphere.radius : 1;
        if (sphere && sphere.center) this.boundCenter.copy(sphere.center);
        return this.boundRadius;
    }
    build() {
        if (this.levels.length) return this;
        var radius = this.radius();
        var schedule = this.scheduleOption || [{ ratio: 1, distance: 0 }, { ratio: 0.5, distance: radius * 6 }, { ratio: 0.25, distance: radius * 12 }];
        for (var i = 0; i < schedule.length; i++) {
            var entry = schedule[i];
            var levelGeometry = i === 0 ? this.mesh.geometry : simplifyQuadric(this.mesh.geometry, { targetRatio: entry.ratio, lockBoundary: this.lockBoundary });
            var material = this.mesh.material && this.mesh.material.clone ? this.mesh.material.clone() : new BasicMaterial();
            if (this.mesh.material) material.vertexColors = this.mesh.material.vertexColors === true;
            var levelMesh = new Mesh(levelGeometry, material);
            levelMesh.visible = false;
            this.add(levelMesh);
            var triangles = levelGeometry.userData && typeof levelGeometry.userData.simplifyTriangles === "number" ? levelGeometry.userData.simplifyTriangles : Math.floor((levelGeometry.index ? levelGeometry.index.length : levelGeometry.attributes.position.array.length / 3) / 3);
            var error = levelGeometry.userData && typeof levelGeometry.userData.simplifyError === "number" ? levelGeometry.userData.simplifyError : 0;
            this.levels.push({ geometry: levelGeometry, mesh: levelMesh, material: material, ratio: entry.ratio === undefined ? 1 : entry.ratio, distance: entry.distance, triangles: triangles, error: error, originalTransparent: material.transparent === true });
        }
        this.chain = this.levels.slice();
        return this;
    }
    levelMaterial(index) {
        if (index < 0 || index >= this.chain.length) return null;
        if (this.chain[index].impostor) return this.billboard ? this.billboard.material : null;
        return this.chain[index].material;
    }
    setLevelOpacity(index, value) {
        var material = this.levelMaterial(index);
        if (material) { material.opacity = value; material.transparent = true; material.needsUpdate = true; }
    }
    beginSwitch(desired) {
        if (this.fade.active) this.finishFade();
        var from = this.activeLevel;
        this.activeLevel = desired;
        this.counters.switches++;
        if (this.fadeFrames >= 2 && from >= 0 && this.levelMaterial(from) && this.levelMaterial(desired)) {
            this.fade = { active: true, from: from, to: desired, progress: 0 };
        }
    }
    stepFade() {
        this.fade.progress += 1 / this.fadeFrames;
        if (this.fade.progress >= 1) { this.finishFade(); return; }
        var coverage = ditheredOpacity(this.fade.progress);
        this.setLevelOpacity(this.fade.from, 1 - coverage);
        this.setLevelOpacity(this.fade.to, coverage);
    }
    finishFade() {
        if (!this.fade.active) return;
        var from = this.fade.from, to = this.fade.to;
        this.setLevelOpacity(from, 1);
        this.setLevelOpacity(to, 1);
        if (this.chain[from] && !this.chain[from].impostor && this.chain[from].originalTransparent === false) this.chain[from].material.transparent = false;
        if (this.chain[to] && !this.chain[to].impostor && this.chain[to].originalTransparent === false) this.chain[to].material.transparent = false;
        this.fade = { active: false, from: -1, to: -1, progress: 0 };
    }
    show(index) {
        if (index < 0 || index >= this.chain.length) return;
        if (this.chain[index].impostor) { if (this.billboard) this.billboard.visible = true; }
        else this.chain[index].mesh.visible = true;
    }
    applyVisibility() {
        for (var i = 0; i < this.levels.length; i++) this.levels[i].mesh.visible = false;
        if (this.billboard) this.billboard.visible = false;
        if (this.fade.active) { this.show(this.fade.from); this.show(this.fade.to); }
        else if (this.activeLevel >= 0) this.show(this.activeLevel);
    }
    frameForDirection(dir) {
        var views = this.impostor.views;
        var ax = Math.abs(dir.x), ay = Math.abs(dir.y), az = Math.abs(dir.z);
        if (views === 4) return ax >= az ? (dir.x >= 0 ? 0 : 1) : (dir.z >= 0 ? 2 : 3);
        if (ax >= ay && ax >= az) return dir.x >= 0 ? 0 : 1;
        if (ay >= az) return dir.y >= 0 ? 2 : 3;
        return dir.z >= 0 ? 4 : 5;
    }
    updateBillboard(camPos, worldPos, dist) {
        if (!this.impostor || !this.billboard || !this.billboard.visible) return;
        this.billboard.lookAt(camPos);
        this.billboard.scale.setScalar(Math.max(1e-6, dist * this.impostor.tanHalfFov));
        this.billboard.updateMatrixWorld(true);
        var dir = new Vector3().subVectors(camPos, worldPos);
        if (dir.lengthSq() < 1e-12) dir.set(0, 0, 1);
        dir.normalize();
        var frameIndex = this.frameForDirection(dir);
        var frame = this.impostor.frames[frameIndex];
        this.billboard.geometry.attributes.uv = frame.uv;
        this.impostor.frame = frameIndex;
    }
    update(camera) {
        if (!camera || camera.position === undefined) throw new Error("AutomaticLOD.update requires a camera with a position");
        if (!this.levels.length) this.build();
        this.counters.frames++;
        this.updateMatrixWorld(true);
        camera.updateMatrixWorld(true);
        var worldPos = this.getWorldPosition(new Vector3());
        var camPos = camera.getWorldPosition(new Vector3());
        var dist = worldPos.distanceTo(camPos);
        var desired = 0;
        for (var i = this.chain.length - 1; i >= 0; i--) {
            if (dist >= this.chain[i].distance) { desired = i; break; }
        }
        if (desired !== this.activeLevel && this.activeLevel >= 0 && this.hysteresis > 0 && this.chain[desired]) {
            var boundary = this.chain[Math.max(this.activeLevel, desired)].distance;
            if (Math.abs(dist - boundary) <= this.hysteresis * Math.max(1e-9, boundary)) desired = this.activeLevel;
        }
        if (desired !== this.activeLevel) this.beginSwitch(desired);
        if (this.fade.active) this.stepFade();
        this.applyVisibility();
        this.updateBillboard(camPos, worldPos, dist);
        return this.snapshot();
    }
    snapshot() {
        var chain = [];
        for (var i = 0; i < this.chain.length; i++) chain.push({ triangles: this.chain[i].triangles === undefined ? null : this.chain[i].triangles, error: this.chain[i].error === undefined ? null : this.chain[i].error, distance: this.chain[i].distance, impostor: this.chain[i].impostor === true });
        return { level: this.activeLevel, switches: this.counters.switches, frames: this.counters.frames, fade: { active: this.fade.active, from: this.fade.from, to: this.fade.to, progress: this.fade.active ? this.fade.progress : 1 }, chain: chain, impostor: this.impostor ? { frame: this.impostor.frame === undefined ? -1 : this.impostor.frame, views: this.impostor.views, size: this.impostor.size } : null };
    }
    async captureImpostor(renderer, options) {
        if (!renderer || !renderer.device || !renderer.initialized) throw new Error("AutomaticLOD.captureImpostor requires an initialized WebGPU renderer");
        options = options || {};
        if (!this.levels.length) this.build();
        var size = options.size === undefined ? 128 : options.size;
        if (typeof size !== "number" || !isFinite(size) || Math.floor(size) !== size || size < 8) throw new Error("AutomaticLOD captureImpostor size must be an integer of at least 8");
        var views = options.views === undefined ? 6 : options.views;
        if (views !== 4 && views !== 6) throw new Error("AutomaticLOD captureImpostor views must be 4 or 6");
        var radius = this.radius();
        var center = this.boundCenter;
        var lastDistance = this.chain.length ? this.chain[this.chain.length - 1].distance : 0;
        var impostorDistance = faoxomvalue(options.distance, Math.max(lastDistance * 1.5, radius * 6));
        if (typeof impostorDistance !== "number" || !isFinite(impostorDistance) || impostorDistance < 0) throw new Error("AutomaticLOD captureImpostor distance must be a non-negative finite number");
        var device = renderer.device;
        var dCam = Math.max(radius * 3, radius + 1e-3);
        var halfFov = Math.asin(Math.min(0.999, radius / dCam));
        var tanHalf = Math.tan(halfFov);
        var fovDeg = halfFov * 360 / Math.PI;
        var near = Math.max(1e-4, dCam - 2 * radius);
        var far = dCam + 2 * radius;
        var dirs = views === 4 ? [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]] : [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
        var captureScene = new Scene();
        var captureMesh = new Mesh(this.mesh.geometry, new BasicMaterial({ vertexColors: true, side: DoubleSide }));
        captureScene.add(captureMesh);
        var oldClear = { r: renderer.clearColor.r, g: renderer.clearColor.g, b: renderer.clearColor.b };
        renderer.clearColor.r = 37 / 255;
        renderer.clearColor.g = 201 / 255;
        renderer.clearColor.b = 151 / 255;
        var pitch = Math.ceil(size * 4 / 256) * 256;
        var atlas = new Uint8Array(views * size * size * 4);
        for (var k = 0; k < views; k++) {
            var colorTex = device.createTexture({ size: [size, size, 1], format: "rgba8unorm", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
            var depthTex = device.createTexture({ size: [size, size, 1], format: "depth24plus", usage: GPUTextureUsage.RENDER_ATTACHMENT });
            var camera = new PerspectiveCamera(fovDeg, 1, near, far);
            camera.position.set(center.x + dirs[k][0] * dCam, center.y + dirs[k][1] * dCam, center.z + dirs[k][2] * dCam);
            camera.lookAt(center);
            camera.updateMatrixWorld(true);
            renderer.renderToView(captureScene, camera, colorTex.createView(), depthTex.createView(), "rgba8unorm");
            var staging = device.createBuffer({ size: pitch * size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
            var encoder = device.createCommandEncoder();
            encoder.copyTextureToBuffer({ texture: colorTex }, { buffer: staging, bytesPerRow: pitch, rowsPerImage: size }, [size, size, 1]);
            device.queue.submit([encoder.finish()]);
            await staging.mapAsync(GPUMapMode.READ);
            var bytes = new Uint8Array(staging.getMappedRange());
            for (var row = 0; row < size; row++) {
                for (var col = 0; col < size; col++) {
                    var src = row * pitch + col * 4;
                    var dst = (row * views * size + k * size + col) * 4;
                    if (bytes[src] === 37 && bytes[src + 1] === 201 && bytes[src + 2] === 151 && bytes[src + 3] === 255) {
                        atlas[dst] = 37; atlas[dst + 1] = 201; atlas[dst + 2] = 151; atlas[dst + 3] = 0;
                    } else {
                        atlas[dst] = bytes[src]; atlas[dst + 1] = bytes[src + 1]; atlas[dst + 2] = bytes[src + 2]; atlas[dst + 3] = bytes[src + 3];
                    }
                }
            }
            staging.unmap();
            staging.destroy();
            colorTex.destroy();
            depthTex.destroy();
        }
        renderer.clearColor.r = oldClear.r;
        renderer.clearColor.g = oldClear.g;
        renderer.clearColor.b = oldClear.b;
        var texture = new DataTexture(atlas, views * size, size, { minFilter: "linear", magFilter: "linear" });
        var quad = new Geometry();
        quad.setAttribute("position", new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3);
        quad.setAttribute("normal", new Float32Array([0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]), 3);
        quad.setAttribute("uv", new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2);
        quad.setIndex(new Uint16Array([0, 1, 2, 0, 2, 3]));
        var billboardMaterial = new BasicMaterial({ map: texture, transparent: true, side: DoubleSide });
        var billboard = new Mesh(quad, billboardMaterial);
        billboard.visible = false;
        this.add(billboard);
        var frames = [];
        for (var f = 0; f < views; f++) {
            var u0 = f / views, u1 = (f + 1) / views;
            frames.push({ dir: dirs[f], index: f, u0: u0, u1: u1, v0: 0, v1: 1, uv: { array: new Float32Array([u0, 0, u1, 0, u1, 1, u0, 1]), itemSize: 2 } });
        }
        this.impostor = { size: size, views: views, frames: frames, data: atlas, texture: texture, tanHalfFov: tanHalf, distance: impostorDistance, frame: -1 };
        this.billboard = billboard;
        this.chain = this.levels.concat([{ distance: impostorDistance, impostor: true }]);
        return this;
    }
    dispose() {
        if (this.fade.active) this.finishFade();
        for (var i = 0; i < this.levels.length; i++) {
            this.remove(this.levels[i].mesh);
            if (i > 0 && this.levels[i].geometry && this.levels[i].geometry.dispose) this.levels[i].geometry.dispose();
        }
        if (this.billboard) {
            this.remove(this.billboard);
            this.billboard.material.map = null;
            if (this.billboard.geometry && this.billboard.geometry.dispose) this.billboard.geometry.dispose();
        }
        this.levels = [];
        this.chain = [];
        this.impostor = null;
        this.billboard = null;
        this.activeLevel = -1;
        return this;
    }
}

export { AutomaticLOD, simplifyQuadric, bayer8, ditherThreshold, ditheredOpacity };
