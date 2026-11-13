import { Vector2, Vector3, faoxomvalue } from "../math/index.js";

function bvhBuildCore(positions, indices, options) {
    var maxLeafTris = options.maxLeafTris, maxDepth = options.maxDepth, spatial = options.spatialSplits, bins = 16;
    var triangleCount = indices ? indices.length / 3 : positions.length / 9;
    var nb = [], nl = [], nr = [], nst = [], nct = [], triRefs = [];
    var spatialSplits = 0, maxDepthSeen = 0, leaves = 0, splitFallbacks = 0;
    function sa(b0, b1, b2, b3, b4, b5) { var x = b3 - b0, y = b4 - b1, z = b5 - b2; return 2 * (x * y + y * z + z * x); }
    function allocate(b0, b1, b2, b3, b4, b5) { nb.push(b0, b1, b2, b3, b4, b5); nl.push(-1); nr.push(-1); nst.push(-1); nct.push(0); return nl.length - 1; }
    function appendLeaf(tri, count) { leaves++; var start = triRefs.length; for (var i = 0; i < count; i++) triRefs.push(tri[i]); return start; }
    function buildNode(refTri, refB, depth) {
        var count = refTri.length;
        var u = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
        for (var i = 0; i < count; i++) { var o = i * 6; if (u[0] > refB[o]) u[0] = refB[o]; if (u[1] > refB[o + 1]) u[1] = refB[o + 1]; if (u[2] > refB[o + 2]) u[2] = refB[o + 2]; if (u[3] < refB[o + 3]) u[3] = refB[o + 3]; if (u[4] < refB[o + 4]) u[4] = refB[o + 4]; if (u[5] < refB[o + 5]) u[5] = refB[o + 5]; }
        var id = allocate(u[0], u[1], u[2], u[3], u[4], u[5]);
        if (depth > maxDepthSeen) maxDepthSeen = depth;
        if (count <= maxLeafTris || depth >= maxDepth) { nst[id] = appendLeaf(refTri, count); nct[id] = count; return id; }
        var bestCost = Infinity, bestAxis = -1, bestBin = -1;
        var nodeSA = sa(u[0], u[1], u[2], u[3], u[4], u[5]);
        for (var axis = 0; axis < 3; axis++) {
            var co = axis, cenMin = Infinity, cenMax = -Infinity;
            for (var c = 0; c < count; c++) { var cen = (refB[c * 6 + co] + refB[c * 6 + co + 3]) * 0.5; if (cen < cenMin) cenMin = cen; if (cen > cenMax) cenMax = cen; }
            var extent = cenMax - cenMin;
            if (!(extent > 0)) continue;
            var scale = bins / extent;
            var binN = [], binB = [];
            for (var z = 0; z < bins; z++) { binN.push(0); binB.push(Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity); }
            for (var r = 0; r < count; r++) {
                var cc = (refB[r * 6 + co] + refB[r * 6 + co + 3]) * 0.5;
                var bi = Math.floor((cc - cenMin) * scale); if (bi < 0) bi = 0; if (bi > bins - 1) bi = bins - 1;
                binN[bi]++;
                for (var k = 0; k < 6; k++) { var val = refB[r * 6 + k]; if (k < 3) { if (val < binB[bi * 6 + k]) binB[bi * 6 + k] = val; } else { if (val > binB[bi * 6 + k]) binB[bi * 6 + k] = val; } }
            }
            var lN = 0, l0 = Infinity, l1 = Infinity, l2 = Infinity, l3 = -Infinity, l4 = -Infinity, l5 = -Infinity;
            for (var s = 1; s < bins; s++) {
                var po = (s - 1) * 6;
                lN += binN[s - 1];
                if (binB[po] < l0) l0 = binB[po]; if (binB[po + 1] < l1) l1 = binB[po + 1]; if (binB[po + 2] < l2) l2 = binB[po + 2];
                if (binB[po + 3] > l3) l3 = binB[po + 3]; if (binB[po + 4] > l4) l4 = binB[po + 4]; if (binB[po + 5] > l5) l5 = binB[po + 5];
                if (lN === 0) continue;
                var rN = 0, r0 = Infinity, r1 = Infinity, r2 = Infinity, r3 = -Infinity, r4 = -Infinity, r5 = -Infinity;
                for (var w = s; w < bins; w++) { var ro = w * 6; rN += binN[w]; if (binB[ro] < r0) r0 = binB[ro]; if (binB[ro + 1] < r1) r1 = binB[ro + 1]; if (binB[ro + 2] < r2) r2 = binB[ro + 2]; if (binB[ro + 3] > r3) r3 = binB[ro + 3]; if (binB[ro + 4] > r4) r4 = binB[ro + 4]; if (binB[ro + 5] > r5) r5 = binB[ro + 5]; }
                if (rN === 0) continue;
                var cost = sa(l0, l1, l2, l3, l4, l5) * lN + sa(r0, r1, r2, r3, r4, r5) * rN + 1;
                if (cost < bestCost) { bestCost = cost; bestAxis = axis; bestBin = s; }
            }
        }
        var leafCost = nodeSA * count;
        if (bestAxis < 0 || bestCost >= leafCost) { nst[id] = appendLeaf(refTri, count); nct[id] = count; return id; }
        var co2 = bestAxis, cenMin2 = Infinity, cenMax2 = -Infinity;
        for (var c2 = 0; c2 < count; c2++) { var cen2 = (refB[c2 * 6 + co2] + refB[c2 * 6 + co2 + 3]) * 0.5; if (cen2 < cenMin2) cenMin2 = cen2; if (cen2 > cenMax2) cenMax2 = cen2; }
        var splitPos = cenMin2 + (cenMax2 - cenMin2) * bestBin / bins;
        var leftTri = [], leftB = [], rightTri = [], rightB = [];
        for (var p = 0; p < count; p++) {
            var pc = (refB[p * 6 + co2] + refB[p * 6 + co2 + 3]) * 0.5;
            if (pc < splitPos) { leftTri.push(refTri[p]); for (var pk = 0; pk < 6; pk++) leftB.push(refB[p * 6 + pk]); }
            else { rightTri.push(refTri[p]); for (var pk2 = 0; pk2 < 6; pk2++) rightB.push(refB[p * 6 + pk2]); }
        }
        var lb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], rb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
        for (var li = 0; li < leftB.length; li += 6) { if (lb[0] > leftB[li]) lb[0] = leftB[li]; if (lb[1] > leftB[li + 1]) lb[1] = leftB[li + 1]; if (lb[2] > leftB[li + 2]) lb[2] = leftB[li + 2]; if (lb[3] < leftB[li + 3]) lb[3] = leftB[li + 3]; if (lb[4] < leftB[li + 4]) lb[4] = leftB[li + 4]; if (lb[5] < leftB[li + 5]) lb[5] = leftB[li + 5]; }
        for (var ri = 0; ri < rightB.length; ri += 6) { if (rb[0] > rightB[ri]) rb[0] = rightB[ri]; if (rb[1] > rightB[ri + 1]) rb[1] = rightB[ri + 1]; if (rb[2] > rightB[ri + 2]) rb[2] = rightB[ri + 2]; if (rb[3] < rightB[ri + 3]) rb[3] = rightB[ri + 3]; if (rb[4] < rightB[ri + 4]) rb[4] = rightB[ri + 4]; if (rb[5] < rightB[ri + 5]) rb[5] = rightB[ri + 5]; }
        var doSpatial = false;
        if (spatial && depth + 1 < maxDepth && leftTri.length > 0 && rightTri.length > 0) {
            var ox0 = lb[0] > rb[0] ? lb[0] : rb[0], oy0 = lb[1] > rb[1] ? lb[1] : rb[1], oz0 = lb[2] > rb[2] ? lb[2] : rb[2];
            var ox1 = lb[3] < rb[3] ? lb[3] : rb[3], oy1 = lb[4] < rb[4] ? lb[4] : rb[4], oz1 = lb[5] < rb[5] ? lb[5] : rb[5];
            if (ox0 < ox1 && oy0 < oy1 && oz0 < oz1 && sa(ox0, oy0, oz0, ox1, oy1, oz1) > 0.1 * nodeSA && triRefs.length + count * 2 <= triangleCount * 2 + 16) doSpatial = true;
        }
        if (doSpatial) {
            leftTri = []; leftB = []; rightTri = []; rightB = [];
            for (var g = 0; g < count; g++) {
                var tri = refTri[g], gw = g * 6;
                var goesLeft = refB[gw + co2] < splitPos, goesRight = refB[gw + co2 + 3] > splitPos;
                if (goesLeft) { leftTri.push(tri); for (var lk = 0; lk < 6; lk++) { var lv = refB[gw + lk]; if (lk === co2 + 3 && lv > splitPos) lv = splitPos; leftB.push(lv); } }
                if (goesRight) { rightTri.push(tri); for (var rk = 0; rk < 6; rk++) { var rv = refB[gw + rk]; if (rk === co2 && rv < splitPos) rv = splitPos; rightB.push(rv); } }
                if (goesLeft && goesRight) spatialSplits++;
            }
        }
        if (leftTri.length === 0 || rightTri.length === 0) {
            leftTri = []; leftB = []; rightTri = []; rightB = [];
            var half = Math.floor(count / 2);
            for (var h = 0; h < count; h++) { if (h < half) { leftTri.push(refTri[h]); for (var hk = 0; hk < 6; hk++) leftB.push(refB[h * 6 + hk]); } else { rightTri.push(refTri[h]); for (var hk2 = 0; hk2 < 6; hk2++) rightB.push(refB[h * 6 + hk2]); } }
            splitFallbacks++;
        }
        nl[id] = buildNode(leftTri, leftB, depth + 1);
        nr[id] = buildNode(rightTri, rightB, depth + 1);
        return id;
    }
    var rootTri = [], rootB = [];
    for (var t = 0; t < triangleCount; t++) {
        var ia = indices ? indices[t * 3] : t * 3, ib = indices ? indices[t * 3 + 1] : t * 3 + 1, ic = indices ? indices[t * 3 + 2] : t * 3 + 2;
        var ax = positions[ia * 3], ay = positions[ia * 3 + 1], az = positions[ia * 3 + 2];
        var bx = positions[ib * 3], by = positions[ib * 3 + 1], bz = positions[ib * 3 + 2];
        var cx = positions[ic * 3], cy = positions[ic * 3 + 1], cz = positions[ic * 3 + 2];
        var mnx = ax < bx ? (ax < cx ? ax : cx) : (bx < cx ? bx : cx), mny = ay < by ? (ay < cy ? ay : cy) : (by < cy ? by : cy), mnz = az < bz ? (az < cz ? az : cz) : (bz < cz ? bz : cz);
        var mxx = ax > bx ? (ax > cx ? ax : cx) : (bx > cx ? bx : cx), mxy = ay > by ? (ay > cy ? ay : cy) : (by > cy ? by : cy), mxz = az > bz ? (az > cz ? az : cz) : (bz > cz ? bz : cz);
        rootTri.push(t); rootB.push(mnx, mny, mnz, mxx, mxy, mxz);
    }
    buildNode(rootTri, rootB, 0);
    var nodeCount = nl.length;
    var nodeBounds = new Float32Array(nodeCount * 6), nodeLeft = new Int32Array(nodeCount), nodeRight = new Int32Array(nodeCount), nodeStart = new Int32Array(nodeCount), nodeCountArr = new Int32Array(nodeCount), triRefsArr = new Uint32Array(triRefs.length);
    for (var n = 0; n < nodeCount * 6; n++) nodeBounds[n] = nb[n];
    for (var n2 = 0; n2 < nodeCount; n2++) { nodeLeft[n2] = nl[n2]; nodeRight[n2] = nr[n2]; nodeStart[n2] = nst[n2]; nodeCountArr[n2] = nct[n2]; }
    for (var r3 = 0; r3 < triRefs.length; r3++) triRefsArr[r3] = triRefs[r3];
    return { nodeBounds: nodeBounds, nodeLeft: nodeLeft, nodeRight: nodeRight, nodeStart: nodeStart, nodeCount: nodeCountArr, triRefs: triRefsArr, triangles: triangleCount, spatialSplits: spatialSplits, maxDepth: maxDepthSeen, leaves: leaves, nodes: nodeCount, splitFallbacks: splitFallbacks };
}

function pointInTriangle(px, py, pz, ax, ay, az, bx, by, bz, cx, cy, cz) {
    var e1x = bx - ax, e1y = by - ay, e1z = bz - az, e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
    var apx = px - ax, apy = py - ay, apz = pz - az;
    var d11 = e1x * e1x + e1y * e1y + e1z * e1z, d12 = e1x * e2x + e1y * e2y + e1z * e2z, d22 = e2x * e2x + e2y * e2y + e2z * e2z;
    var d1p = e1x * apx + e1y * apy + e1z * apz, d2p = e2x * apx + e2y * apy + e2z * apz;
    var denom = d11 * d22 - d12 * d12;
    if (Math.abs(denom) < 1e-18) return false;
    var v = (d22 * d1p - d12 * d2p) / denom, w = (d11 * d2p - d12 * d1p) / denom;
    return v >= -1e-9 && w >= -1e-9 && v + w <= 1 + 1e-9;
}

function dist4(px, py, pz, qx, qy, qz) {
    var ex = px - qx, ey = py - qy, ez = pz - qz;
    return [qx, qy, qz, Math.sqrt(ex * ex + ey * ey + ez * ez)];
}

function boxDistanceAt(pa, pb, s, b0, b1, b2, b3, b4, b5) {
    var x = pa[0] + (pb[0] - pa[0]) * s, y = pa[1] + (pb[1] - pa[1]) * s, z = pa[2] + (pb[2] - pa[2]) * s;
    var dx = Math.max(b0 - x, 0, x - b3), dy = Math.max(b1 - y, 0, y - b4), dz = Math.max(b2 - z, 0, z - b5);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function segmentSegmentClosest(p1, q1, p2, q2) {
    var d1x = q1[0] - p1[0], d1y = q1[1] - p1[1], d1z = q1[2] - p1[2];
    var d2x = q2[0] - p2[0], d2y = q2[1] - p2[1], d2z = q2[2] - p2[2];
    var rx = p1[0] - p2[0], ry = p1[1] - p2[1], rz = p1[2] - p2[2];
    var a = d1x * d1x + d1y * d1y + d1z * d1z, e = d2x * d2x + d2y * d2y + d2z * d2z;
    var f = d2x * rx + d2y * ry + d2z * rz;
    var s = 0, t = 0;
    if (a <= 1e-18 && e <= 1e-18) { }
    else if (a <= 1e-18) t = Math.max(0, Math.min(1, f / e));
    else {
        var c = d1x * rx + d1y * ry + d1z * rz;
        if (e <= 1e-18) s = Math.max(0, Math.min(1, -c / a));
        else {
            var b = d1x * d2x + d1y * d2y + d1z * d2z;
            var denom = a * e - b * b;
            s = denom > 1e-18 ? Math.max(0, Math.min(1, (b * f - c * e) / denom)) : 0;
            t = (b * s + f) / e;
            if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -c / a)); }
            else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (b - c) / a)); }
        }
    }
    var c1x = p1[0] + d1x * s, c1y = p1[1] + d1y * s, c1z = p1[2] + d1z * s;
    var c2x = p2[0] + d2x * t, c2y = p2[1] + d2y * t, c2z = p2[2] + d2z * t;
    var ex = c1x - c2x, ey = c1y - c2y, ez = c1z - c2z;
    return [c1x, c1y, c1z, c2x, c2y, c2z, Math.sqrt(ex * ex + ey * ey + ez * ez)];
}

function closestOnSegmentToPoint(a, b, p) {
    var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    var len2 = dx * dx + dy * dy + dz * dz;
    if (len2 < 1e-18) return [a[0], a[1], a[2]];
    var s = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy + (p[2] - a[2]) * dz) / len2;
    s = Math.max(0, Math.min(1, s));
    return [a[0] + dx * s, a[1] + dy * s, a[2] + dz * s];
}

class BVH {
    constructor(data, options, prebuilt) {
        this.type = "BVH";
        this.isBVH = true;
        var prep = BVH._prepare(data, options);
        this.maxLeafTris = prep.maxLeafTris; this.maxDepth = prep.maxDepth; this.spatialSplits = prep.spatialSplits;
        this.positions = prep.positions; this.indices = prep.indices; this.uv = prep.uv; this.triangleCount = prep.triangleCount;
        this.lastQueryTriangleTests = 0;
        var t0 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
        if (prebuilt) {
            if (!prebuilt.nodeBounds || !prebuilt.nodeLeft || !prebuilt.nodeRight || !prebuilt.nodeStart || !prebuilt.nodeCount || !prebuilt.triRefs) throw new Error("BVH prebuilt payload is missing arrays");
            if (prebuilt.nodeLeft.length !== prebuilt.nodeRight.length || prebuilt.nodeLeft.length !== prebuilt.nodeBounds.length / 6) throw new Error("BVH prebuilt payload array sizes disagree");
            this.nodeBounds = prebuilt.nodeBounds; this.nodeLeft = prebuilt.nodeLeft; this.nodeRight = prebuilt.nodeRight; this.nodeStart = prebuilt.nodeStart; this.nodeCountArr = prebuilt.nodeCount; this.triRefs = prebuilt.triRefs;
            this.statsSpatialSplits = prebuilt.spatialSplits || 0; this.statsMaxDepth = prebuilt.maxDepth || 0; this.statsLeaves = prebuilt.leaves || 0; this.statsNodes = prebuilt.nodes || prebuilt.nodeLeft.length; this.statsFallbacks = prebuilt.splitFallbacks || 0;
        } else {
            var built = bvhBuildCore(this.positions, this.indices, { maxLeafTris: prep.maxLeafTris, maxDepth: prep.maxDepth, spatialSplits: prep.spatialSplits });
            this.nodeBounds = built.nodeBounds; this.nodeLeft = built.nodeLeft; this.nodeRight = built.nodeRight; this.nodeStart = built.nodeStart; this.nodeCountArr = built.nodeCount; this.triRefs = built.triRefs;
            this.statsSpatialSplits = built.spatialSplits; this.statsMaxDepth = built.maxDepth; this.statsLeaves = built.leaves; this.statsNodes = built.nodes; this.statsFallbacks = built.splitFallbacks;
        }
        this.buildMs = ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now()) - t0;
        this.bounds = { min: new Vector3(this.nodeBounds[0], this.nodeBounds[1], this.nodeBounds[2]), max: new Vector3(this.nodeBounds[3], this.nodeBounds[4], this.nodeBounds[5]) };
        this.disposed = false;
    }
    static _prepare(data, options) {
        options = options || {};
        var maxLeafTris = faoxomvalue(options.maxLeafTris, 8);
        if (typeof maxLeafTris !== "number" || !isFinite(maxLeafTris) || Math.floor(maxLeafTris) !== maxLeafTris || maxLeafTris < 1) throw new Error("BVH maxLeafTris must be an integer of at least 1");
        var maxDepth = faoxomvalue(options.maxDepth, 32);
        if (typeof maxDepth !== "number" || !isFinite(maxDepth) || Math.floor(maxDepth) !== maxDepth || maxDepth < 1) throw new Error("BVH maxDepth must be an integer of at least 1");
        var spatialSplits = faoxomvalue(options.spatialSplits, true);
        if (typeof spatialSplits !== "boolean") throw new Error("BVH spatialSplits must be a boolean");
        if (options.worker !== undefined && typeof options.worker !== "boolean") throw new Error("BVH worker must be a boolean");
        var positions = null, indices = null, uv = null;
        if (data && data.attributes && data.attributes.position) {
            if (!data.attributes.position.array || !data.attributes.position.array.length) throw new Error("BVH requires a non-empty position attribute");
            positions = data.attributes.position.array;
            indices = data.index || null;
            if (data.attributes.uv && data.attributes.uv.array) uv = { array: data.attributes.uv.array, itemSize: data.attributes.uv.itemSize || 2 };
        } else if (data && (data.positions || data.vertices)) {
            positions = data.positions || data.vertices;
            indices = data.indices || data.index || null;
            if (data.uv && data.uv.array) uv = { array: data.uv.array, itemSize: data.uv.itemSize || 2 };
        } else throw new Error("BVH requires a geometry or a {positions, indices} data object");
        if (!positions || !positions.length) throw new Error("BVH requires a non-empty positions array");
        if (positions.length % 3 !== 0) throw new Error("BVH positions length must be a multiple of 3");
        for (var f = 0; f < positions.length; f++) if (typeof positions[f] !== "number" || !isFinite(positions[f])) throw new Error("BVH positions must contain finite numbers");
        var triangleCount = indices ? indices.length / 3 : positions.length / 9;
        if (!triangleCount || Math.floor(triangleCount) !== triangleCount) throw new Error("BVH requires at least one triangle");
        var normalized = null;
        if (indices) {
            if (indices.length % 3 !== 0) throw new Error("BVH index length must be a multiple of 3");
            for (var v = 0; v < indices.length; v++) { var iv = indices[v]; if (typeof iv !== "number" || Math.floor(iv) !== iv || iv < 0 || iv * 3 + 2 >= positions.length) throw new Error("BVH index out of range"); }
            normalized = indices instanceof Uint32Array ? indices : new Uint32Array(indices);
        }
        return { positions: positions, indices: normalized, uv: uv, triangleCount: triangleCount, maxLeafTris: maxLeafTris, maxDepth: maxDepth, spatialSplits: spatialSplits };
    }
    stats() {
        return { nodes: this.statsNodes, leaves: this.statsLeaves, maxDepth: this.statsMaxDepth, refs: this.triRefs.length, triangles: this.triangleCount, spatialSplits: this.statsSpatialSplits, splitFallbacks: this.statsFallbacks, buildMs: this.buildMs };
    }
    triangleIndices(t) {
        if (typeof t !== "number" || Math.floor(t) !== t || t < 0 || t >= this.triangleCount) throw new Error("BVH triangle index out of range");
        return this.indices ? [this.indices[t * 3], this.indices[t * 3 + 1], this.indices[t * 3 + 2]] : [t * 3, t * 3 + 1, t * 3 + 2];
    }
    _vertex(v, out) { out.x = this.positions[v * 3]; out.y = this.positions[v * 3 + 1]; out.z = this.positions[v * 3 + 2]; return out; }
    _triangle(t, a, b, c) {
        var i0 = this.indices ? this.indices[t * 3] : t * 3, i1 = this.indices ? this.indices[t * 3 + 1] : t * 3 + 1, i2 = this.indices ? this.indices[t * 3 + 2] : t * 3 + 2;
        this._vertex(i0, a); this._vertex(i1, b); this._vertex(i2, c);
        return [i0, i1, i2];
    }
    _slab(id, ox, oy, oz, dx, dy, dz) {
        var b0 = this.nodeBounds[id * 6], b1 = this.nodeBounds[id * 6 + 1], b2 = this.nodeBounds[id * 6 + 2], b3 = this.nodeBounds[id * 6 + 3], b4 = this.nodeBounds[id * 6 + 4], b5 = this.nodeBounds[id * 6 + 5];
        var tmin = -Infinity, tmax = Infinity;
        if (dx > 0) { var ta = (b0 - ox) / dx, tb = (b3 - ox) / dx; if (ta > tmin) tmin = ta; if (tb < tmax) tmax = tb; }
        else if (dx < 0) { var ta2 = (b3 - ox) / dx, tb2 = (b0 - ox) / dx; if (ta2 > tmin) tmin = ta2; if (tb2 < tmax) tmax = tb2; }
        else if (ox < b0 || ox > b3) return null;
        if (dy > 0) { var tc = (b1 - oy) / dy, td = (b4 - oy) / dy; if (tc > tmin) tmin = tc; if (td < tmax) tmax = td; }
        else if (dy < 0) { var tc2 = (b4 - oy) / dy, td2 = (b1 - oy) / dy; if (tc2 > tmin) tmin = tc2; if (td2 < tmax) tmax = td2; }
        else if (oy < b1 || oy > b4) return null;
        if (dz > 0) { var te = (b2 - oz) / dz, tf = (b5 - oz) / dz; if (te > tmin) tmin = te; if (tf < tmax) tmax = tf; }
        else if (dz < 0) { var te2 = (b5 - oz) / dz, tf2 = (b2 - oz) / dz; if (te2 > tmin) tmin = te2; if (tf2 < tmax) tmax = tf2; }
        else if (oz < b2 || oz > b5) return null;
        if (tmin > tmax || tmax < 0) return null;
        return tmin < 0 ? 0 : tmin;
    }
    _intersectTriangle(ox, oy, oz, dx, dy, dz, ax, ay, az, bx, by, bz, cx, cy, cz, culling) {
        var e1x = bx - ax, e1y = by - ay, e1z = bz - az, e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
        var px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
        var det = e1x * px + e1y * py + e1z * pz;
        var epsilon = 1e-10;
        if (culling ? det <= epsilon : (det <= epsilon && det >= -epsilon)) return null;
        var inv = 1 / det;
        var tx = ox - ax, ty = oy - ay, tz = oz - az;
        var u = (tx * px + ty * py + tz * pz) * inv;
        if (u < 0 || u > 1) return null;
        var qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
        var v = (dx * qx + dy * qy + dz * qz) * inv;
        if (v < 0 || u + v > 1) return null;
        var t = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (t < 0 || !isFinite(t)) return null;
        return [t, u, v];
    }
    _makeHit(t, u, v, tri, i0, i1, i2, ax, ay, az, bx, by, bz, cx, cy, cz, ox, oy, oz, dx, dy, dz) {
        var nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay), ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az), nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
        var nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;
        var hit = { distance: t, point: new Vector3(ox + t * dx, oy + t * dy, oz + t * dz), faceIndex: tri, indices: [i0, i1, i2], normal: new Vector3(nx, ny, nz) };
        if (this.uv) {
            var w0 = 1 - u - v, arr = this.uv.array, is = this.uv.itemSize;
            hit.uv = new Vector2(arr[i0 * is] * w0 + arr[i1 * is] * u + arr[i2 * is] * v, arr[i0 * is + 1] * w0 + arr[i1 * is + 1] * u + arr[i2 * is + 1] * v);
        } else hit.uv = null;
        return hit;
    }
    _normalizeDirection(direction) {
        if (!direction) throw new Error("BVH query requires a direction vector");
        var dx = direction.x !== undefined ? direction.x : direction[0], dy = direction.y !== undefined ? direction.y : direction[1], dz = direction.z !== undefined ? direction.z : direction[2];
        var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (!len || !isFinite(len)) throw new Error("BVH query direction must be a non-zero finite vector");
        return [dx / len, dy / len, dz / len];
    }
    _validatePoint(p, name) {
        var x = p.x !== undefined ? p.x : p[0], y = p.y !== undefined ? p.y : p[1], z = p.z !== undefined ? p.z : p[2];
        if (typeof x !== "number" || !isFinite(x) || typeof y !== "number" || !isFinite(y) || typeof z !== "number" || !isFinite(z)) throw new Error("BVH " + name + " must be a finite vector");
        return [x, y, z];
    }
    raycastFirst(origin, direction, options) {
        if (this.disposed) throw new Error("BVH is disposed");
        var op = this._validatePoint(origin, "origin"), d = this._normalizeDirection(direction);
        var ox = op[0], oy = op[1], oz = op[2], dx = d[0], dy = d[1], dz = d[2];
        options = options || {};
        var near = faoxomvalue(options.near, 0), far = faoxomvalue(options.far, Infinity);
        var culling = faoxomvalue(options.backfaceCulling, false);
        this.lastQueryTriangleTests = 0;
        var bestT = far, best = null;
        var stack = [0];
        var a = new Vector3(), b = new Vector3(), c = new Vector3();
        while (stack.length) {
            var id = stack.pop();
            var entry = this._slab(id, ox, oy, oz, dx, dy, dz);
            if (entry === null || entry > bestT) continue;
            var count = this.nodeCountArr[id];
            if (count > 0) {
                var start = this.nodeStart[id];
                for (var r = 0; r < count; r++) {
                    var tri = this.triRefs[start + r];
                    this.lastQueryTriangleTests++;
                    var idx = this._triangle(tri, a, b, c);
                    var hit = this._intersectTriangle(ox, oy, oz, dx, dy, dz, a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, culling);
                    if (!hit || hit[0] < near || hit[0] > bestT) continue;
                    bestT = hit[0];
                    best = this._makeHit(hit[0], hit[1], hit[2], tri, idx[0], idx[1], idx[2], a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, ox, oy, oz, dx, dy, dz);
                }
            } else {
                var left = this.nodeLeft[id], right = this.nodeRight[id];
                var el = this._slab(left, ox, oy, oz, dx, dy, dz), er = this._slab(right, ox, oy, oz, dx, dy, dz);
                if (el !== null && er !== null) { if (el <= er) { stack.push(right); stack.push(left); } else { stack.push(left); stack.push(right); } }
                else if (el !== null) stack.push(left);
                else if (er !== null) stack.push(right);
            }
        }
        return best;
    }
    raycastAny(origin, direction, options) {
        if (this.disposed) throw new Error("BVH is disposed");
        var op = this._validatePoint(origin, "origin"), d = this._normalizeDirection(direction);
        var ox = op[0], oy = op[1], oz = op[2], dx = d[0], dy = d[1], dz = d[2];
        options = options || {};
        var near = faoxomvalue(options.near, 0), far = faoxomvalue(options.far, Infinity);
        var culling = faoxomvalue(options.backfaceCulling, false);
        this.lastQueryTriangleTests = 0;
        var stack = [0];
        var a = new Vector3(), b = new Vector3(), c = new Vector3();
        while (stack.length) {
            var id = stack.pop();
            var entry = this._slab(id, ox, oy, oz, dx, dy, dz);
            if (entry === null || entry > far) continue;
            var count = this.nodeCountArr[id];
            if (count > 0) {
                var start = this.nodeStart[id];
                for (var r = 0; r < count; r++) {
                    var tri = this.triRefs[start + r];
                    this.lastQueryTriangleTests++;
                    var idx = this._triangle(tri, a, b, c);
                    var hit = this._intersectTriangle(ox, oy, oz, dx, dy, dz, a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, culling);
                    if (hit && hit[0] >= near && hit[0] <= far) return this._makeHit(hit[0], hit[1], hit[2], tri, idx[0], idx[1], idx[2], a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, ox, oy, oz, dx, dy, dz);
                }
            } else {
                stack.push(this.nodeRight[id]);
                stack.push(this.nodeLeft[id]);
            }
        }
        return null;
    }
    raycastAll(origin, direction, options) {
        if (this.disposed) throw new Error("BVH is disposed");
        var op = this._validatePoint(origin, "origin"), d = this._normalizeDirection(direction);
        var ox = op[0], oy = op[1], oz = op[2], dx = d[0], dy = d[1], dz = d[2];
        options = options || {};
        var near = faoxomvalue(options.near, 0), far = faoxomvalue(options.far, Infinity);
        var culling = faoxomvalue(options.backfaceCulling, false);
        this.lastQueryTriangleTests = 0;
        var hits = [];
        var seen = this._stamp();
        var stack = [0];
        var a = new Vector3(), b = new Vector3(), c = new Vector3();
        while (stack.length) {
            var id = stack.pop();
            var entry = this._slab(id, ox, oy, oz, dx, dy, dz);
            if (entry === null || entry > far) continue;
            var count = this.nodeCountArr[id];
            if (count > 0) {
                var start = this.nodeStart[id];
                for (var r = 0; r < count; r++) {
                    var tri = this.triRefs[start + r];
                    if (seen[tri] === this._stampId) continue;
                    seen[tri] = this._stampId;
                    this.lastQueryTriangleTests++;
                    var idx = this._triangle(tri, a, b, c);
                    var hit = this._intersectTriangle(ox, oy, oz, dx, dy, dz, a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, culling);
                    if (hit && hit[0] >= near && hit[0] <= far) hits.push(this._makeHit(hit[0], hit[1], hit[2], tri, idx[0], idx[1], idx[2], a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, ox, oy, oz, dx, dy, dz));
                }
            } else {
                stack.push(this.nodeRight[id]);
                stack.push(this.nodeLeft[id]);
            }
        }
        hits.sort(function (p, r2) { return p.distance - r2.distance; });
        return hits;
    }
    _stamp() {
        if (!this._stampArray || this._stampArray.length < this.triangleCount) this._stampArray = new Uint32Array(this.triangleCount);
        this._stampId = (this._stampId || 0) + 1;
        return this._stampArray;
    }
    sphereCast(origin, radius, direction, maxDistance) {
        if (this.disposed) throw new Error("BVH is disposed");
        if (typeof radius !== "number" || !isFinite(radius) || radius < 0) throw new Error("BVH sphereCast radius must be a non-negative finite number");
        if (typeof maxDistance !== "number" || !isFinite(maxDistance) || maxDistance < 0) throw new Error("BVH sphereCast maxDistance must be a non-negative finite number");
        var op = this._validatePoint(origin, "origin"), d = this._normalizeDirection(direction);
        var ox = op[0], oy = op[1], oz = op[2], dx = d[0], dy = d[1], dz = d[2];
        this.lastQueryTriangleTests = 0;
        var best = null, bestT = maxDistance;
        var stack = [0];
        var a = new Vector3(), b = new Vector3(), c = new Vector3();
        while (stack.length) {
            var id = stack.pop();
            var entry = this._slabInflated(id, ox, oy, oz, dx, dy, dz, radius);
            if (entry === null || entry > bestT) continue;
            var count = this.nodeCountArr[id];
            if (count > 0) {
                var start = this.nodeStart[id];
                for (var r = 0; r < count; r++) {
                    var tri = this.triRefs[start + r];
                    this.lastQueryTriangleTests++;
                    var res = this._sphereCastTriangle(ox, oy, oz, dx, dy, dz, bestT, radius, tri, a, b, c);
                    if (res && res[0] < bestT) { bestT = res[0]; best = res; }
                }
            } else { stack.push(this.nodeRight[id]); stack.push(this.nodeLeft[id]); }
        }
        if (!best) return null;
        return { time: best[0], point: new Vector3(best[1], best[2], best[3]), normal: new Vector3(best[4], best[5], best[6]) };
    }
    _slabInflated(id, ox, oy, oz, dx, dy, dz, r) {
        var b0 = this.nodeBounds[id * 6] - r, b1 = this.nodeBounds[id * 6 + 1] - r, b2 = this.nodeBounds[id * 6 + 2] - r, b3 = this.nodeBounds[id * 6 + 3] + r, b4 = this.nodeBounds[id * 6 + 4] + r, b5 = this.nodeBounds[id * 6 + 5] + r;
        var tmin = -Infinity, tmax = Infinity;
        if (dx > 0) { var ta = (b0 - ox) / dx, tb = (b3 - ox) / dx; if (ta > tmin) tmin = ta; if (tb < tmax) tmax = tb; }
        else if (dx < 0) { var ta2 = (b3 - ox) / dx, tb2 = (b0 - ox) / dx; if (ta2 > tmin) tmin = ta2; if (tb2 < tmax) tmax = tb2; }
        else if (ox < b0 - 1e-9 || ox > b3 + 1e-9) return null;
        if (dy > 0) { var tc = (b1 - oy) / dy, td = (b4 - oy) / dy; if (tc > tmin) tmin = tc; if (td < tmax) tmax = td; }
        else if (dy < 0) { var tc2 = (b4 - oy) / dy, td2 = (b1 - oy) / dy; if (tc2 > tmin) tmin = tc2; if (td2 < tmax) tmax = td2; }
        else if (oy < b1 - 1e-9 || oy > b4 + 1e-9) return null;
        if (dz > 0) { var te = (b2 - oz) / dz, tf = (b5 - oz) / dz; if (te > tmin) tmin = te; if (tf < tmax) tmax = tf; }
        else if (dz < 0) { var te2 = (b5 - oz) / dz, tf2 = (b2 - oz) / dz; if (te2 > tmin) tmin = te2; if (tf2 < tmax) tmax = tf2; }
        else if (oz < b2 - 1e-9 || oz > b5 + 1e-9) return null;
        if (tmin > tmax || tmax < 0) return null;
        return tmin < 0 ? 0 : tmin;
    }
    _sphereCastTriangle(ox, oy, oz, dx, dy, dz, maxT, r, tri, a, b, c) {
        var idx = this._triangle(tri, a, b, c);
        var ax = a.x, ay = a.y, az = a.z, bx = b.x, by = b.y, bz = b.z, cx = c.x, cy = c.y, cz = c.z;
        var bestT = Infinity, bestN = null;
        var nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay), ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az), nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
        var nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (nl > 1e-12) {
            nx /= nl; ny /= nl; nz /= nl;
            var height = (ox - ax) * nx + (oy - ay) * ny + (oz - az) * nz;
            var px0 = ox - height * nx, py0 = oy - height * ny, pz0 = oz - height * nz;
            if (Math.abs(height) <= r + 1e-9 && pointInTriangle(px0, py0, pz0, ax, ay, az, bx, by, bz, cx, cy, cz)) { var hs = height >= 0 ? 1 : -1; return [0, px0, py0, pz0, hs * nx, hs * ny, hs * nz]; }
            var dn = dx * nx + dy * ny + dz * nz;
            if (Math.abs(dn) > 1e-12) {
                var base = (ax - ox) * nx + (ay - oy) * ny + (az - oz) * nz;
                for (var sign = -1; sign <= 1; sign += 2) {
                    var t = (base + sign * r) / dn;
                    if (t >= 0 && t <= maxT && t < bestT) {
                        var qx = ox + t * dx - sign * r * nx, qy = oy + t * dy - sign * r * ny, qz = oz + t * dz - sign * r * nz;
                        if (pointInTriangle(qx, qy, qz, ax, ay, az, bx, by, bz, cx, cy, cz)) { bestT = t; bestN = [sign * nx, sign * ny, sign * nz]; }
                    }
                }
            }
        }
        var edges = [[ax, ay, az, bx, by, bz], [bx, by, bz, cx, cy, cz], [cx, cy, cz, ax, ay, az]];
        for (var e = 0; e < 3; e++) {
            var p0x = edges[e][0], p0y = edges[e][1], p0z = edges[e][2], ux = edges[e][3] - p0x, uy = edges[e][4] - p0y, uz = edges[e][5] - p0z;
            var el = Math.sqrt(ux * ux + uy * uy + uz * uz);
            if (el <= 1e-12) continue;
            ux /= el; uy /= el; uz /= el;
            var wx = ox - p0x, wy = oy - p0y, wz = oz - p0z;
            var wu = wx * ux + wy * uy + wz * uz, du = dx * ux + dy * uy + dz * uz;
            var cand = [];
            var A = 1 - du * du;
            if (A > 1e-12) {
                var B = 2 * ((wx * dx + wy * dy + wz * dz) - wu * du);
                var C = (wx * wx + wy * wy + wz * wz) - wu * wu - r * r;
                var disc = B * B - 4 * A * C;
                if (disc >= 0) { var sq = Math.sqrt(disc); cand.push((-B - sq) / (2 * A)); cand.push((-B + sq) / (2 * A)); }
            } else {
                if (du > 1e-12) cand.push((0 - wu) / du);
                else if (du < -1e-12) cand.push((el - wu) / du);
                cand.push(0);
            }
            for (var ci = 0; ci < cand.length; ci++) {
                var t2 = cand[ci];
                if (t2 < 0 || t2 > maxT || t2 >= bestT) continue;
                var hx = ox + t2 * dx - p0x, hy = oy + t2 * dy - p0y, hz = oz + t2 * dz - p0z;
                var s = hx * ux + hy * uy + hz * uz;
                var lateralSq = (hx * hx + hy * hy + hz * hz) - s * s;
                if (s < -1e-9 || s > el + 1e-9 || lateralSq > r * r + 1e-9) continue;
                var qx2 = p0x + s * ux, qy2 = p0y + s * uy, qz2 = p0z + s * uz;
                var ddx = ox + t2 * dx - qx2, ddy = oy + t2 * dy - qy2, ddz = oz + t2 * dz - qz2;
                var dl = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);
                if (dl > 1e-12) { bestT = t2; bestN = [ddx / dl, ddy / dl, ddz / dl]; }
                else if (t2 === 0) { bestT = 0; bestN = [ux, uy, uz]; }
            }
        }
        var verts = [[ax, ay, az], [bx, by, bz], [cx, cy, cz]];
        for (var v = 0; v < 3; v++) {
            var vx = verts[v][0] - ox, vy = verts[v][1] - oy, vz = verts[v][2] - oz;
            var b2 = vx * dx + vy * dy + vz * dz;
            var c2 = vx * vx + vy * vy + vz * vz - r * r;
            if (c2 <= 1e-9) { var d0 = Math.sqrt(vx * vx + vy * vy + vz * vz); if (d0 > 1e-12 && bestT > 0) { bestT = 0; bestN = [-vx / d0, -vy / d0, -vz / d0]; } continue; }
            var disc2 = b2 * b2 - c2;
            if (disc2 < 0) continue;
            var t3 = b2 - Math.sqrt(disc2);
            if (t3 >= 0 && t3 <= maxT && t3 < bestT) { var cxv = ox + t3 * dx - verts[v][0], cyv = oy + t3 * dy - verts[v][1], czv = oz + t3 * dz - verts[v][2]; var cl = Math.sqrt(cxv * cxv + cyv * cyv + czv * czv); if (cl > 1e-12) { bestT = t3; bestN = [cxv / cl, cyv / cl, czv / cl]; } }
        }
        if (bestN === null) return null;
        return [bestT, ox + bestT * dx - bestN[0] * r, oy + bestT * dy - bestN[1] * r, oz + bestT * dz - bestN[2] * r, bestN[0], bestN[1], bestN[2]];
    }
    closestPoint(point) {
        if (this.disposed) throw new Error("BVH is disposed");
        var p = this._validatePoint(point, "point");
        this.lastQueryTriangleTests = 0;
        var best = Infinity, bestPoint = null, bestTri = -1;
        var stack = [0];
        var a = new Vector3(), b = new Vector3(), c = new Vector3();
        while (stack.length) {
            var id = stack.pop();
            var b0 = this.nodeBounds[id * 6], b1 = this.nodeBounds[id * 6 + 1], b2 = this.nodeBounds[id * 6 + 2], b3 = this.nodeBounds[id * 6 + 3], b4 = this.nodeBounds[id * 6 + 4], b5 = this.nodeBounds[id * 6 + 5];
            var ddx = Math.max(b0 - p[0], 0, p[0] - b3), ddy = Math.max(b1 - p[1], 0, p[1] - b4), ddz = Math.max(b2 - p[2], 0, p[2] - b5);
            if (Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz) >= best) continue;
            var count = this.nodeCountArr[id];
            if (count > 0) {
                var start = this.nodeStart[id];
                for (var r = 0; r < count; r++) {
                    var tri = this.triRefs[start + r];
                    this.lastQueryTriangleTests++;
                    var cp = this._closestPointTriangle(p[0], p[1], p[2], tri, a, b, c);
                    if (cp[3] < best) { best = cp[3]; bestPoint = [cp[0], cp[1], cp[2]]; bestTri = tri; }
                }
            } else {
                stack.push(this.nodeRight[id]);
                stack.push(this.nodeLeft[id]);
            }
        }
        if (!bestPoint) return null;
        return { point: new Vector3(bestPoint[0], bestPoint[1], bestPoint[2]), distance: best, faceIndex: bestTri };
    }
    _closestPointTriangle(px, py, pz, tri, a, b, c) {
        this._triangle(tri, a, b, c);
        var ax = a.x, ay = a.y, az = a.z, bx = b.x, by = b.y, bz = b.z, cx = c.x, cy = c.y, cz = c.z;
        var abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az, apx = px - ax, apy = py - ay, apz = pz - az;
        var d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
        if (d1 <= 0 && d2 <= 0) return dist4(px, py, pz, ax, ay, az);
        var bpx = px - bx, bpy = py - by, bpz = pz - bz;
        var d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
        if (d3 >= 0 && d4 <= d3) return dist4(px, py, pz, bx, by, bz);
        var vc = d1 * d4 - d3 * d2;
        if (vc <= 0 && d1 >= 0 && d3 <= 0) { var v = d1 / (d1 - d3); return dist4(px, py, pz, ax + abx * v, ay + aby * v, az + abz * v); }
        var cpx = px - cx, cpy = py - cy, cpz = pz - cz;
        var d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
        if (d6 >= 0 && d5 <= d6) return dist4(px, py, pz, cx, cy, cz);
        var vb = d5 * d2 - d1 * d6;
        if (vb <= 0 && d2 >= 0 && d6 <= 0) { var w = d2 / (d2 - d6); return dist4(px, py, pz, ax + acx * w, ay + acy * w, az + acz * w); }
        var va = d3 * d6 - d5 * d4;
        if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) { var w2 = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return dist4(px, py, pz, bx + (cx - bx) * w2, by + (cy - by) * w2, bz + (cz - bz) * w2); }
        var denom = 1 / (va + vb + vc);
        var v2 = vb * denom, w3 = vc * denom;
        return dist4(px, py, pz, ax + abx * v2 + acx * w3, ay + aby * v2 + acy * w3, az + abz * v2 + acz * w3);
    }
    closestPointSegment(a, b) {
        if (this.disposed) throw new Error("BVH is disposed");
        var pa = this._validatePoint(a, "segment endpoint"), pb = this._validatePoint(b, "segment endpoint");
        this.lastQueryTriangleTests = 0;
        var best = Infinity, bestPoint = null, bestTri = -1;
        var stack = [0];
        var va = new Vector3(), vb = new Vector3(), vc = new Vector3();
        while (stack.length) {
            var id = stack.pop();
            if (this._segmentBoxDistance(pa, pb, id) >= best) continue;
            var count = this.nodeCountArr[id];
            if (count > 0) {
                var start = this.nodeStart[id];
                for (var r = 0; r < count; r++) {
                    var tri = this.triRefs[start + r];
                    this.lastQueryTriangleTests++;
                    var cp = this._closestPointSegmentTriangle(pa, pb, tri, va, vb, vc);
                    if (cp[3] < best) { best = cp[3]; bestPoint = [cp[0], cp[1], cp[2]]; bestTri = tri; }
                }
            } else { stack.push(this.nodeRight[id]); stack.push(this.nodeLeft[id]); }
        }
        if (!bestPoint) return null;
        return { point: new Vector3(bestPoint[0], bestPoint[1], bestPoint[2]), distance: best, faceIndex: bestTri };
    }
    _segmentBoxDistance(pa, pb, id) {
        var b0 = this.nodeBounds[id * 6], b1 = this.nodeBounds[id * 6 + 1], b2 = this.nodeBounds[id * 6 + 2], b3 = this.nodeBounds[id * 6 + 3], b4 = this.nodeBounds[id * 6 + 4], b5 = this.nodeBounds[id * 6 + 5];
        var lo = 0, hi = 1;
        for (var it = 0; it < 48; it++) {
            var m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
            if (boxDistanceAt(pa, pb, m1, b0, b1, b2, b3, b4, b5) < boxDistanceAt(pa, pb, m2, b0, b1, b2, b3, b4, b5)) hi = m2;
            else lo = m1;
        }
        return boxDistanceAt(pa, pb, (lo + hi) / 2, b0, b1, b2, b3, b4, b5);
    }
    _closestPointSegmentTriangle(pa, pb, tri, a, b, c) {
        this._triangle(tri, a, b, c);
        var pts = [[a.x, a.y, a.z], [b.x, b.y, b.z], [c.x, c.y, c.z]];
        var best = null, bestD = Infinity;
        for (var ep = 0; ep < 2; ep++) {
            var px = ep === 0 ? pa[0] : pb[0], py = ep === 0 ? pa[1] : pb[1], pz = ep === 0 ? pa[2] : pb[2];
            var cp = this._closestPointTriangle(px, py, pz, tri, a, b, c);
            if (cp[3] < bestD) { bestD = cp[3]; best = [cp[0], cp[1], cp[2]]; }
        }
        for (var e = 0; e < 3; e++) {
            var p2 = pts[e], q2 = pts[(e + 1) % 3];
            var res = segmentSegmentClosest(pa, pb, p2, q2);
            if (res[6] < bestD) { bestD = res[6]; best = [res[3], res[4], res[5]]; }
        }
        return [best[0], best[1], best[2], bestD];
    }
    capsuleCast(a, b, radius, direction, maxDistance) {
        if (this.disposed) throw new Error("BVH is disposed");
        if (typeof radius !== "number" || !isFinite(radius) || radius < 0) throw new Error("BVH capsuleCast radius must be a non-negative finite number");
        if (typeof maxDistance !== "number" || !isFinite(maxDistance) || maxDistance < 0) throw new Error("BVH capsuleCast maxDistance must be a non-negative finite number");
        var d = this._normalizeDirection(direction);
        var pa = this._validatePoint(a, "capsule endpoint"), pb = this._validatePoint(b, "capsule endpoint");
        var dx = d[0], dy = d[1], dz = d[2];
        this.lastQueryTriangleTests = 0;
        var tol = 1e-7;
        var va = new Vector3(), vb = new Vector3(), vc = new Vector3();
        var t = 0, prev = 0, touching = false;
        for (var iter = 0; iter < 64; iter++) {
            var sa = [pa[0] + dx * t, pa[1] + dy * t, pa[2] + dz * t], sb = [pb[0] + dx * t, pb[1] + dy * t, pb[2] + dz * t];
            var cp = this._segmentMeshClosest(sa, sb, va, vb, vc);
            if (!cp) return null;
            if (cp.distance <= radius + tol) { touching = true; break; }
            var step = cp.distance - radius;
            if (step <= tol) { touching = true; break; }
            prev = t;
            t += step;
            if (t > maxDistance) return null;
        }
        if (!touching) return null;
        var hitT = t;
        if (t > 0) {
            var lo = prev, hi = t;
            for (var bis = 0; bis < 48; bis++) {
                var mid = (lo + hi) / 2;
                var mcp = this._segmentMeshClosest([pa[0] + dx * mid, pa[1] + dy * mid, pa[2] + dz * mid], [pb[0] + dx * mid, pb[1] + dy * mid, pb[2] + dz * mid], va, vb, vc);
                if (mcp && mcp.distance <= radius) { hi = mid; hitT = mid; } else lo = mid;
            }
        }
        var fa = [pa[0] + dx * hitT, pa[1] + dy * hitT, pa[2] + dz * hitT], fb = [pb[0] + dx * hitT, pb[1] + dy * hitT, pb[2] + dz * hitT];
        var fcp = this._segmentMeshClosest(fa, fb, va, vb, vc);
        if (!fcp) return null;
        var axisPt = closestOnSegmentToPoint(fa, fb, fcp.point);
        var nvx = axisPt[0] - fcp.point[0], nvy = axisPt[1] - fcp.point[1], nvz = axisPt[2] - fcp.point[2];
        var nl = Math.sqrt(nvx * nvx + nvy * nvy + nvz * nvz);
        var normal = nl > 1e-12 ? new Vector3(nvx / nl, nvy / nl, nvz / nl) : new Vector3(0, 1, 0);
        return { time: hitT, point: new Vector3(fcp.point[0], fcp.point[1], fcp.point[2]), normal: normal };
    }
    _segmentMeshClosest(sa, sb, va, vb, vc) {
        var best = Infinity, bestPoint = null;
        var stack = [0];
        while (stack.length) {
            var id = stack.pop();
            if (this._segmentBoxDistance(sa, sb, id) >= best) continue;
            var count = this.nodeCountArr[id];
            if (count > 0) {
                var start = this.nodeStart[id];
                for (var r = 0; r < count; r++) {
                    var tri = this.triRefs[start + r];
                    this.lastQueryTriangleTests++;
                    var cp = this._closestPointSegmentTriangle(sa, sb, tri, va, vb, vc);
                    if (cp[3] < best) { best = cp[3]; bestPoint = [cp[0], cp[1], cp[2]]; }
                }
            } else { stack.push(this.nodeRight[id]); stack.push(this.nodeLeft[id]); }
        }
        if (!bestPoint) return null;
        return { point: bestPoint, distance: best };
    }
    dispose() {
        if (this.disposed) return this;
        this.nodeBounds = null; this.nodeLeft = null; this.nodeRight = null; this.nodeStart = null; this.nodeCountArr = null; this.triRefs = null;
        this.positions = null; this.indices = null; this.uv = null; this._stampArray = null;
        this.disposed = true;
        return this;
    }
    static buildAsync(data, options) {
        return new Promise(function (resolve, reject) {
            var sync = !options || options.worker !== false;
            sync = sync && (typeof Worker !== "undefined" && typeof Blob !== "undefined" && typeof URL !== "undefined" && !!URL.createObjectURL);
            if (!sync) {
                try { resolve(new BVH(data, options)); } catch (error) { reject(error); }
                return;
            }
            var prep;
            try { prep = BVH._prepare(data, options); } catch (error) { reject(error); return; }
            var payloadPositions = prep.positions instanceof Float32Array ? prep.positions.slice() : new Float32Array(prep.positions);
            var payloadIndices = prep.indices ? prep.indices.slice() : null;
            var sanitized = { maxLeafTris: prep.maxLeafTris, maxDepth: prep.maxDepth, spatialSplits: prep.spatialSplits };
            var source = "self.onmessage=function(e){var r=(" + bvhBuildCore.toString() + ")(e.data.p,e.data.i,e.data.o);self.postMessage(r,[r.nodeBounds.buffer,r.nodeLeft.buffer,r.nodeRight.buffer,r.nodeStart.buffer,r.nodeCount.buffer,r.triRefs.buffer]);};";
            var worker;
            try { worker = new Worker(URL.createObjectURL(new Blob([source], { type: "application/javascript" }))); }
            catch (error) { try { resolve(new BVH(data, options)); } catch (error2) { reject(error2); } return; }
            worker.onmessage = function (event) {
                worker.terminate();
                try { resolve(new BVH(data, options, event.data)); } catch (error) { reject(error); }
            };
            worker.onerror = function () {
                worker.terminate();
                try { resolve(new BVH(data, Object.assign({}, options, { worker: false }))); } catch (error) { reject(error); }
            };
            var transfer = [payloadPositions.buffer];
            if (payloadIndices) transfer.push(payloadIndices.buffer);
            worker.postMessage({ p: payloadPositions, i: payloadIndices, o: sanitized }, transfer);
        });
    }
}

export { BVH };
