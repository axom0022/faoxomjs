import { Matrix4 } from "../math/index.js";
import { Geometry } from "../geometries/Geometry.js";
import { MeshletSet } from "./MeshletSet.js";

const fxomvgswgsl = `struct fxparams {
    viewpos: vec4<f32>,
    planes: array<vec4<f32>, 6>,
    misc: vec4<f32>,
    misc2: vec4<f32>,
};
struct fxcluster {
    a: vec4<f32>,
    b: vec4<f32>,
    c: vec4<f32>,
};
@group(0) @binding(0) var<uniform> params: fxparams;
@group(0) @binding(1) var<storage, read> clusters: array<fxcluster>;
@group(0) @binding(2) var<storage, read_write> sel: array<u32>;
@group(0) @binding(3) var<storage, read_write> flags: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read> resident: array<u32>;
fn fxscreenerr(i: u32) -> f32 {
    let c = clusters[i];
    var d = length(params.viewpos.xyz - c.a.xyz) - c.a.w;
    if (d < 0.001) { d = 0.001; }
    return c.c.x * params.viewpos.w / d;
}
fn fxvisible(i: u32) -> u32 {
    let c = clusters[i];
    var vis = 1u;
    if (params.misc.y > 0.5 && c.c.w > 0.5) {
        var u = params.viewpos.xyz - c.a.xyz;
        var r = length(u);
        if (r < 0.000001) {
            u = vec3<f32>(0.0, 1.0, 0.0);
            r = 1.0;
        } else {
            u = u / r;
        }
        let cosb = dot(u, c.b.xyz);
        let sinb = sqrt(max(0.0, 1.0 - cosb * cosb));
        let sintheta = sqrt(max(0.0, 1.0 - c.b.w * c.b.w));
        let bbound = cosb * c.b.w + sinb * sintheta;
        if (cosb < c.b.w && bbound < -1.0e-6 && r * (-bbound) >= c.a.w) {
            vis = 0u;
        }
    }
    if (vis == 1u) {
        var p = 0;
        loop {
            if (p >= 6) {
                break;
            }
            var dist = dot(params.planes[p].xyz, c.a.xyz) + params.planes[p].w;
            if (dist < -c.a.w) {
                vis = 0u;
            }
            p = p + 1;
        }
    }
    return vis;
}
@compute @workgroup_size(64)
fn fxmain(@builtin(global_invocation_id) gid: vec3<u32>) {
    if (gid.x >= u32(params.misc.x)) {
        return;
    }
    let i = u32(params.misc.w) + gid.x;
    let c = clusters[i];
    let want = fxscreenerr(i) <= params.misc.z;
    var parentwanted = false;
    if (c.c.y >= 0.0) {
        parentwanted = fxscreenerr(u32(c.c.y)) <= params.misc.z;
    }
    let desired = fxvisible(i) == 1u && want && (c.c.y < 0.0 || !parentwanted);
    let fb = atomicLoad(&flags[i]);
    var res = 1u;
    if (params.misc2.x > 0.5) {
        res = resident[i];
    }
    if (res == 1u) {
        var outv = 0u;
        if (desired || fb > 0u) {
            outv = 1u;
        }
        sel[i] = outv;
    } else {
        sel[i] = 0u;
        if (desired || fb > 0u) {
            if (c.c.y >= 0.0) {
                atomicOr(&flags[u32(c.c.y)], 1u);
            }
        }
    }
}`;

function fxomvgssolve(quad, pax, pay, paz, pbx, pby, pbz) {
    var q00 = quad[0], q01 = quad[1], q02 = quad[2], q03 = quad[3];
    var q11 = quad[4], q12 = quad[5], q13 = quad[6];
    var q22 = quad[7], q23 = quad[8], q33 = quad[9];
    var a00 = q00, a01 = q01, a02 = q02;
    var a10 = q01, a11 = q11, a12 = q12;
    var a20 = q02, a21 = q12, a22 = q22;
    var b0 = -q03, b1 = -q13, b2 = -q23;
    var det = a00 * (a11 * a22 - a12 * a21) - a01 * (a10 * a22 - a12 * a20) + a02 * (a10 * a21 - a11 * a20);
    var px = (pax + pbx) * 0.5, py = (pay + pby) * 0.5, pz = (paz + pbz) * 0.5;
    if (Math.abs(det) > 1e-10) {
        var dx = b0 * (a11 * a22 - a12 * a21) - a01 * (b1 * a22 - a12 * b2) + a02 * (b1 * a21 - a11 * b2);
        var dy = a00 * (b1 * a22 - a12 * b2) - b0 * (a10 * a22 - a12 * a20) + a02 * (a10 * b2 - b1 * a20);
        var dz = a00 * (a11 * b2 - b1 * a21) - a01 * (a10 * b2 - b1 * a20) + b0 * (a10 * a21 - a11 * a20);
        px = dx / det; py = dy / det; pz = dz / det;
        if (!isFinite(px) || !isFinite(py) || !isFinite(pz)) {
            px = (pax + pbx) * 0.5; py = (pay + pby) * 0.5; pz = (paz + pbz) * 0.5;
        }
    }
    var x = px, y = py, z = pz, w = 1;
    var value = q00 * x * x + 2 * q01 * x * y + 2 * q02 * x * z + 2 * q03 * x * w
        + q11 * y * y + 2 * q12 * y * z + 2 * q13 * y * w
        + q22 * z * z + 2 * q23 * z * w
        + q33 * w * w;
    if (!isFinite(value)) value = 1e30;
    if (value < 0) value = 0;
    return { x: px, y: py, z: pz, cost: value };
}

function fxomvgsimplify(pos, nrm, uv, idx, owner, ownerCount, targetTris) {
    var vertCount = pos.length / 3;
    var triCount = idx.length / 3;
    var alive = new Uint8Array(vertCount);
    var triAlive = new Uint8Array(triCount);
    for (var i0 = 0; i0 < vertCount; i0++) alive[i0] = 1;
    for (var i1 = 0; i1 < triCount; i1++) triAlive[i1] = 1;
    var liveTris = triCount;
    var pendingErr = new Float64Array(ownerCount);
    var guard = 0;
    var maxGuard = vertCount * 4 + 16;
    while (liveTris > targetTris && guard < maxGuard) {
        guard++;
        var quad = new Float64Array(vertCount * 10);
        for (var t = 0; t < triCount; t++) {
            if (!triAlive[t]) continue;
            var ia = idx[t * 3], ib = idx[t * 3 + 1], ic = idx[t * 3 + 2];
            var ax = pos[ia * 3], ay = pos[ia * 3 + 1], az = pos[ia * 3 + 2];
            var bx = pos[ib * 3], by = pos[ib * 3 + 1], bz = pos[ib * 3 + 2];
            var cx = pos[ic * 3], cy = pos[ic * 3 + 1], cz = pos[ic * 3 + 2];
            var e1x = bx - ax, e1y = by - ay, e1z = bz - az;
            var e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
            var nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
            var nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
            if (nl < 1e-12) continue;
            nx /= nl; ny /= nl; nz /= nl;
            var area = nl * 0.5;
            var d = -(nx * ax + ny * ay + nz * az);
            var w = area;
            var vertsOf = [ia, ib, ic];
            for (var vv = 0; vv < 3; vv++) {
                var o = vertsOf[vv] * 10;
                quad[o] += nx * nx * w; quad[o + 1] += nx * ny * w; quad[o + 2] += nx * nz * w; quad[o + 3] += nx * d * w;
                quad[o + 4] += ny * ny * w; quad[o + 5] += ny * nz * w; quad[o + 6] += ny * d * w;
                quad[o + 7] += nz * nz * w; quad[o + 8] += nz * d * w;
                quad[o + 9] += d * d * w;
            }
        }
        var edges = [];
        var edgeFirst = [];
        var edgeSecond = [];
        var edgeTris = [];
        var emap = new Map();
        for (var t2 = 0; t2 < triCount; t2++) {
            if (!triAlive[t2]) continue;
            for (var e = 0; e < 3; e++) {
                var va = idx[t2 * 3 + e];
                var vb = idx[t2 * 3 + ((e + 1) % 3)];
                var lo = va < vb ? va : vb;
                var hi = va < vb ? vb : va;
                var key = lo * vertCount + hi;
                var eid = emap.get(key);
                if (eid === undefined) {
                    eid = edges.length;
                    emap.set(key, eid);
                    edgeFirst.push(lo);
                    edgeSecond.push(hi);
                    edgeTris.push([]);
                    edges.push(key);
                }
                edgeTris[eid].push(t2);
            }
        }
        for (var be = 0; be < edges.length; be++) {
            if (edgeTris[be].length !== 1) continue;
            var ta = edgeTris[be][0];
            var pa = edgeFirst[be], pb = edgeSecond[be];
            var pax = pos[pa * 3], pay = pos[pa * 3 + 1], paz = pos[pa * 3 + 2];
            var pbx = pos[pb * 3], pby = pos[pb * 3 + 1], pbz = pos[pb * 3 + 2];
            var iax = idx[ta * 3], ibx = idx[ta * 3 + 1], icx = idx[ta * 3 + 2];
            var fx = pos[iax * 3], fy = pos[iax * 3 + 1], fz = pos[iax * 3 + 2];
            var gx = pos[ibx * 3], gy = pos[ibx * 3 + 1], gz = pos[ibx * 3 + 2];
            var hx = pos[icx * 3], hy = pos[icx * 3 + 1], hz = pos[icx * 3 + 2];
            var tnx = (gy - fy) * (hz - fz) - (gz - fz) * (hy - fy);
            var tny = (gz - fz) * (hx - fx) - (gx - fx) * (hz - fz);
            var tnz = (gx - fx) * (hy - fy) - (gy - fy) * (hx - fx);
            var tnl = Math.sqrt(tnx * tnx + tny * tny + tnz * tnz) || 1;
            tnx /= tnl; tny /= tnl; tnz /= tnl;
            var edgx = pbx - pax, edgy = pby - pay, edgz = pbz - paz;
            var mx = edgy * tnz - edgz * tny;
            var my = edgz * tnx - edgx * tnz;
            var mz = edgx * tny - edgy * tnx;
            var ml = Math.sqrt(mx * mx + my * my + mz * mz);
            if (ml < 1e-12) continue;
            mx /= ml; my /= ml; mz /= ml;
            var md = -(mx * pax + my * pay + mz * paz);
            var bw = 100;
            var pair = [pa, pb];
            for (var pw = 0; pw < 2; pw++) {
                var o2 = pair[pw] * 10;
                quad[o2] += mx * mx * bw; quad[o2 + 1] += mx * my * bw; quad[o2 + 2] += mx * mz * bw; quad[o2 + 3] += mx * md * bw;
                quad[o2 + 4] += my * my * bw; quad[o2 + 5] += my * mz * bw; quad[o2 + 6] += my * md * bw;
                quad[o2 + 7] += mz * mz * bw; quad[o2 + 8] += mz * md * bw;
                quad[o2 + 9] += md * md * bw;
            }
        }
        var best = -1, bestCost = Infinity, bestKey = -1, bestSol = null;
        for (var e2 = 0; e2 < edges.length; e2++) {
            if (edgeTris[e2].length !== 2) continue;
            var a = edgeFirst[e2], b = edgeSecond[e2];
            var qa = quad.slice(a * 10, a * 10 + 10);
            var qb = quad.slice(b * 10, b * 10 + 10);
            var q = [];
            for (var qq = 0; qq < 10; qq++) q.push(qa[qq] + qb[qq]);
            var sol = fxomvgssolve(q, pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2], pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]);
            if (!isFinite(sol.cost)) continue;
            var key2 = a * vertCount + b;
            if (sol.cost < bestCost - 1e-14 || (sol.cost - bestCost <= 1e-14 && sol.cost - bestCost >= -1e-14 && key2 < bestKey)) {
                best = e2; bestCost = sol.cost; bestKey = key2; bestSol = sol;
            }
        }
        if (best < 0 || !bestSol) break;
        var ka = edgeFirst[best], kb = edgeSecond[best];
        var disp = Math.max(
            Math.sqrt((bestSol.x - pos[ka * 3]) * (bestSol.x - pos[ka * 3]) + (bestSol.y - pos[ka * 3 + 1]) * (bestSol.y - pos[ka * 3 + 1]) + (bestSol.z - pos[ka * 3 + 2]) * (bestSol.z - pos[ka * 3 + 2])),
            Math.sqrt((bestSol.x - pos[kb * 3]) * (bestSol.x - pos[kb * 3]) + (bestSol.y - pos[kb * 3 + 1]) * (bestSol.y - pos[kb * 3 + 1]) + (bestSol.z - pos[kb * 3 + 2]) * (bestSol.z - pos[kb * 3 + 2]))
        );
        for (var t3 = 0; t3 < triCount; t3++) {
            if (!triAlive[t3]) continue;
            var v0 = idx[t3 * 3], v1 = idx[t3 * 3 + 1], v2 = idx[t3 * 3 + 2];
            var hasA = v0 === ka || v1 === ka || v2 === ka;
            var hasB = v0 === kb || v1 === kb || v2 === kb;
            if (!hasA && !hasB) continue;
            if (pendingErr[owner[t3]] < disp) pendingErr[owner[t3]] = disp;
            if (hasA && hasB) {
                triAlive[t3] = 0;
                liveTris--;
                continue;
            }
            if (v0 === kb) idx[t3 * 3] = ka;
            if (v1 === kb) idx[t3 * 3 + 1] = ka;
            if (v2 === kb) idx[t3 * 3 + 2] = ka;
        }
        pos[ka * 3] = bestSol.x; pos[ka * 3 + 1] = bestSol.y; pos[ka * 3 + 2] = bestSol.z;
        if (uv) {
            uv[ka * 2] = (uv[ka * 2] + uv[kb * 2]) * 0.5;
            uv[ka * 2 + 1] = (uv[ka * 2 + 1] + uv[kb * 2 + 1]) * 0.5;
        }
        alive[kb] = 0;
    }
    var remap = new Int32Array(vertCount);
    for (var r = 0; r < vertCount; r++) remap[r] = -1;
    var outPos = [], outNrm = [], outUv = uv ? [] : null, outIdx = [];
    var next = 0;
    for (var v2 = 0; v2 < vertCount; v2++) {
        if (!alive[v2]) continue;
        remap[v2] = next++;
        outPos.push(pos[v2 * 3], pos[v2 * 3 + 1], pos[v2 * 3 + 2]);
        if (outUv) outUv.push(uv[v2 * 2], uv[v2 * 2 + 1]);
    }
    for (var t4 = 0; t4 < triCount; t4++) {
        if (!triAlive[t4]) continue;
        outIdx.push(remap[idx[t4 * 3]], remap[idx[t4 * 3 + 1]], remap[idx[t4 * 3 + 2]]);
    }
    var outNrmArr = new Float64Array(outPos.length);
    for (var t5 = 0; t5 * 3 < outIdx.length; t5++) {
        var ja = outIdx[t5 * 3], jb = outIdx[t5 * 3 + 1], jc = outIdx[t5 * 3 + 2];
        var jax = outPos[ja * 3], jay = outPos[ja * 3 + 1], jaz = outPos[ja * 3 + 2];
        var jbx = outPos[jb * 3], jby = outPos[jb * 3 + 1], jbz = outPos[jb * 3 + 2];
        var jcx = outPos[jc * 3], jcy = outPos[jc * 3 + 1], jcz = outPos[jc * 3 + 2];
        var fnx = (jby - jay) * (jcz - jaz) - (jbz - jaz) * (jcy - jay);
        var fny = (jbz - jaz) * (jcx - jax) - (jbx - jax) * (jcz - jaz);
        var fnz = (jbx - jax) * (jcy - jay) - (jby - jay) * (jcx - jax);
        outNrmArr[ja * 3] += fnx; outNrmArr[ja * 3 + 1] += fny; outNrmArr[ja * 3 + 2] += fnz;
        outNrmArr[jb * 3] += fnx; outNrmArr[jb * 3 + 1] += fny; outNrmArr[jb * 3 + 2] += fnz;
        outNrmArr[jc * 3] += fnx; outNrmArr[jc * 3 + 1] += fny; outNrmArr[jc * 3 + 2] += fnz;
    }
    for (var n = 0; n < outNrmArr.length; n += 3) {
        var l2 = Math.sqrt(outNrmArr[n] * outNrmArr[n] + outNrmArr[n + 1] * outNrmArr[n + 1] + outNrmArr[n + 2] * outNrmArr[n + 2]);
        if (l2 > 1e-12) { outNrm.push(outNrmArr[n] / l2, outNrmArr[n + 1] / l2, outNrmArr[n + 2] / l2); }
        else { outNrm.push(0, 1, 0); }
    }
    return { pos: outPos, nrm: outNrm, uv: outUv, idx: outIdx, pendingErr: pendingErr, collapses: guard };
}

function fxomvgsclusterbounds(pos, idx) {
    var minx = 1e30, miny = 1e30, minz = 1e30, maxx = -1e30, maxy = -1e30, maxz = -1e30;
    var seen = {};
    for (var i = 0; i < idx.length; i++) seen[idx[i]] = 1;
    var sx = 0, sy = 0, sz = 0, sn = 0;
    for (var key in seen) {
        var vi = key | 0;
        var px = pos[vi * 3], py = pos[vi * 3 + 1], pz = pos[vi * 3 + 2];
        if (px < minx) minx = px;
        if (py < miny) miny = py;
        if (pz < minz) minz = pz;
        if (px > maxx) maxx = px;
        if (py > maxy) maxy = py;
        if (pz > maxz) maxz = pz;
        sx += px; sy += py; sz += pz; sn++;
    }
    if (sn === 0) { minx = miny = minz = maxx = maxy = maxz = 0; sx = sy = sz = 0; sn = 1; }
    var cx = sx / sn, cy = sy / sn, cz = sz / sn;
    var radius = 0;
    for (var key2 in seen) {
        var vi2 = key2 | 0;
        var dx = pos[vi2 * 3] - cx, dy = pos[vi2 * 3 + 1] - cy, dz = pos[vi2 * 3 + 2] - cz;
        var dl = dx * dx + dy * dy + dz * dz;
        if (dl > radius) radius = dl;
    }
    radius = Math.sqrt(radius);
    var ax = 0, ay = 0, az = 0;
    for (var t = 0; t * 3 < idx.length; t++) {
        var ia = idx[t * 3], ib = idx[t * 3 + 1], ic = idx[t * 3 + 2];
        var axv = pos[ib * 3] - pos[ia * 3], ayv = pos[ib * 3 + 1] - pos[ia * 3 + 1], azv = pos[ib * 3 + 2] - pos[ia * 3 + 2];
        var bxv = pos[ic * 3] - pos[ia * 3], byv = pos[ic * 3 + 1] - pos[ia * 3 + 1], bzv = pos[ic * 3 + 2] - pos[ia * 3 + 2];
        var nx = ayv * bzv - azv * byv, ny = azv * bxv - axv * bzv, nz = axv * byv - ayv * bxv;
        ax += nx; ay += ny; az += nz;
    }
    var al = Math.sqrt(ax * ax + ay * ay + az * az);
    var axis = [0, 1, 0], cosThetaMax = -1, cullable = 0;
    if (al > 1e-6) {
        axis = [ax / al, ay / al, az / al];
        var ctm = 1;
        for (var t2 = 0; t2 * 3 < idx.length; t2++) {
            var ia2 = idx[t2 * 3], ib2 = idx[t2 * 3 + 1], ic2 = idx[t2 * 3 + 2];
            var e1x = pos[ib2 * 3] - pos[ia2 * 3], e1y = pos[ib2 * 3 + 1] - pos[ia2 * 3 + 1], e1z = pos[ib2 * 3 + 2] - pos[ia2 * 3 + 2];
            var e2x = pos[ic2 * 3] - pos[ia2 * 3], e2y = pos[ic2 * 3 + 1] - pos[ia2 * 3 + 1], e2z = pos[ic2 * 3 + 2] - pos[ia2 * 3 + 2];
            var n2x = e1y * e2z - e1z * e2y, n2y = e1z * e2x - e1x * e2z, n2z = e1x * e2y - e1y * e2x;
            var d = n2x * axis[0] + n2y * axis[1] + n2z * axis[2];
            if (d < ctm) ctm = d;
        }
        cosThetaMax = ctm;
        if (ctm > -0.98) cullable = 1;
    }
    return { center: [cx, cy, cz], radius: radius, min: [minx, miny, minz], max: [maxx, maxy, maxz], axis: axis, cosThetaMax: cosThetaMax, cullable: cullable };
}

class FXOMVGS {
    constructor(geometry, options) {
        options = options || {};
        this.source = geometry;
        this.maxVertices = Math.max(3, options.maxVertices || 96);
        this.maxTriangles = Math.max(3, options.maxTriangles || 192);
        this.groupSize = Math.max(2, options.groupSize || 4);
        this.maxLevels = Math.min(24, Math.max(2, options.maxLevels || 16));
        this.renderer = options.renderer || null;
        this.device = this.renderer ? this.renderer.device : null;
        this.clusters = [];
        this.levelRanges = [];
        this.clusterIndices = [];
        this.positions = [];
        this.normals = [];
        this.uvs = null;
        this.pipeline = null;
        this.paramsbuffer = null;
        this.clusterbuffer = null;
        this.selbuffer = null;
        this.flagsbuffer = null;
        this.residentbuffer = null;
        this.readbackbuffer = null;
        this.bind = null;
        this.residentMask = null;
        this.lastUsed = null;
        this.memoryBudget = Infinity;
        this.frame = 0;
        this.lastSelection = null;
        this.stats = { levels: 0, clusters: 0, levelClusters: [], levelTriangles: [], vertices: 0, buildms: 0, simplifyms: 0, selected: 0, selectedTriangles: 0, selectms: 0, resident: 0 };
        this.build();
    }
    build() {
        var t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
        var source = this.source;
        if (!source || !source.attributes || !source.attributes.position) return this;
        var hasNormals = !!source.attributes.normal;
        var hasUv = !!source.attributes.uv;
        var ms = new MeshletSet(source, { maxVertices: this.maxVertices, maxTriangles: this.maxTriangles });
        var pos0 = source.attributes.position.array;
        var nrm0 = hasNormals ? source.attributes.normal.array : null;
        var uv0 = hasUv ? source.attributes.uv.array : null;
        for (var p = 0; p < pos0.length; p++) this.positions.push(pos0[p]);
        if (nrm0) { for (var n = 0; n < nrm0.length; n++) this.normals.push(nrm0[n]); }
        else {
            for (var v = 0; v < pos0.length / 3; v++) this.normals.push(0, 1, 0);
        }
        if (uv0) {
            this.uvs = [];
            for (var u = 0; u < uv0.length; u++) this.uvs.push(uv0[u]);
        }
        var msIndex = ms.geometry.index;
        for (var m = 0; m < ms.meshlets.length; m++) {
            var ml = ms.meshlets[m];
            var first = this.clusterIndices.length;
            for (var k = 0; k < ml.count; k++) this.clusterIndices.push(msIndex[ml.first * 3 + k]);
            this.clusters.push({ level: 0, first: first, count: ml.count, center: ml.center, radius: ml.radius, axis: ml.axis, cosThetaMax: ml.cosThetaMax, cullable: ml.cullable, min: ml.min, max: ml.max, err: 0, parent: -1, triangles: ml.triangles });
        }
        this.levelRanges.push({ start: 0, count: this.clusters.length });
        var simplifyAccum = 0;
        var level = 1;
        while (level < this.maxLevels) {
            var prev = this.levelRanges[this.levelRanges.length - 1];
            if (prev.count <= 1) break;
            var levelStart = this.clusters.length;
            for (var g = prev.start; g < prev.start + prev.count; g += this.groupSize) {
                var gend = Math.min(g + this.groupSize, prev.start + prev.count);
                var localOfGlobal = new Map();
                var localPos = [], localNrm = [], localUv = this.uvs ? [] : null;
                var localIdx = [];
                var owner = [];
                var groupClusterIds = [];
                var childErr = 0;
                for (var ci = g; ci < gend; ci++) {
                    var cl = this.clusters[ci];
                    if (cl.err > childErr) childErr = cl.err;
                    var ownerId = groupClusterIds.length;
                    groupClusterIds.push(ci);
                    for (var k2 = 0; k2 < cl.count; k2 += 3) {
                        for (var vv = 0; vv < 3; vv++) {
                            var gv = this.clusterIndices[cl.first + k2 + vv];
                            var loc = localOfGlobal.get(gv);
                            if (loc === undefined) {
                                loc = localPos.length / 3;
                                localOfGlobal.set(gv, loc);
                                localPos.push(this.positions[gv * 3], this.positions[gv * 3 + 1], this.positions[gv * 3 + 2]);
                                localNrm.push(this.normals[gv * 3], this.normals[gv * 3 + 1], this.normals[gv * 3 + 2]);
                                if (localUv) localUv.push(this.uvs[gv * 2], this.uvs[gv * 2 + 1]);
                            }
                            localIdx.push(loc);
                        }
                        owner.push(ownerId);
                    }
                }
                var groupTris = owner.length;
                var target = Math.max(4, Math.min(Math.floor(this.maxTriangles * 0.9), Math.floor(groupTris * 0.55)));
                var ts = (typeof performance !== "undefined" ? performance.now() : Date.now());
                var sim = fxomvgsimplify(localPos, localNrm, localUv, localIdx, owner, groupClusterIds.length, target);
                simplifyAccum += (typeof performance !== "undefined" ? performance.now() : Date.now()) - ts;
                var perr = childErr;
                for (var pe = 0; pe < sim.pendingErr.length; pe++) {
                    if (sim.pendingErr[pe] > perr) perr = sim.pendingErr[pe];
                }
                var base = this.positions.length / 3;
                for (var np = 0; np < sim.pos.length; np++) this.positions.push(sim.pos[np]);
                for (var nn = 0; nn < sim.nrm.length; nn++) this.normals.push(sim.nrm[nn]);
                if (this.uvs) { for (var nu = 0; nu < sim.uv.length; nu++) this.uvs.push(sim.uv[nu]); }
                var pfirst = this.clusterIndices.length;
                for (var ni = 0; ni < sim.idx.length; ni++) this.clusterIndices.push(sim.idx[ni] + base);
                var bounds = fxomvgsclusterbounds(sim.pos, sim.idx);
                var parentIndex = this.clusters.length;
                this.clusters.push({ level: level, first: pfirst, count: sim.idx.length, center: bounds.center, radius: bounds.radius, axis: bounds.axis, cosThetaMax: bounds.cosThetaMax, cullable: bounds.cullable, min: bounds.min, max: bounds.max, err: perr, parent: -1, triangles: sim.idx.length / 3 });
                for (var ci2 = g; ci2 < gend; ci2++) this.clusters[ci2].parent = parentIndex;
            }
            var produced = this.clusters.length - levelStart;
            if (produced === 0) break;
            this.levelRanges.push({ start: levelStart, count: produced });
            if (produced >= prev.count) break;
            level++;
        }
        this.stats.levels = this.levelRanges.length;
        this.stats.clusters = this.clusters.length;
        this.stats.vertices = this.positions.length / 3;
        for (var lr = 0; lr < this.levelRanges.length; lr++) {
            var range = this.levelRanges[lr];
            var tris = 0, cnt = 0;
            for (var lc = range.start; lc < range.start + range.count; lc++) { tris += this.clusters[lc].triangles; cnt++; }
            this.stats.levelClusters.push(cnt);
            this.stats.levelTriangles.push(tris);
        }
        this.stats.buildms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
        this.stats.simplifyms = simplifyAccum;
        return this;
    }
    ensuregpu() {
        if (this.pipeline) return;
        if (!this.device) throw new Error("FXOMVGS needs a renderer (pass options.renderer)");
        var device = this.device;
        this.pipeline = device.createComputePipeline({ layout: "auto", compute: { module: device.createShaderModule({ code: fxomvgswgsl }), entryPoint: "fxmain" } });
        this.paramsbuffer = device.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        var count = this.clusters.length;
        var data = new Float32Array(count * 12);
        for (var i = 0; i < count; i++) {
            var c = this.clusters[i];
            var b = i * 12;
            data[b] = c.center[0]; data[b + 1] = c.center[1]; data[b + 2] = c.center[2]; data[b + 3] = c.radius;
            data[b + 4] = c.axis[0]; data[b + 5] = c.axis[1]; data[b + 6] = c.axis[2]; data[b + 7] = c.cosThetaMax;
            data[b + 8] = c.err; data[b + 9] = c.parent; data[b + 10] = c.level; data[b + 11] = c.cullable;
        }
        this.clusterbuffer = device.createBuffer({ size: Math.max(16, count * 48), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        device.queue.writeBuffer(this.clusterbuffer, 0, data);
        this.selbuffer = device.createBuffer({ size: Math.max(16, count * 4), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
        this.flagsbuffer = device.createBuffer({ size: Math.max(16, count * 4), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        var zeros = new Uint32Array(count);
        device.queue.writeBuffer(this.flagsbuffer, 0, zeros);
        this.residentbuffer = device.createBuffer({ size: Math.max(16, count * 4), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        var ones = new Uint32Array(count);
        for (var o = 0; o < count; o++) ones[o] = 1;
        device.queue.writeBuffer(this.residentbuffer, 0, ones);
        this.readbackbuffer = device.createBuffer({ size: Math.max(16, count * 4), usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        this.bind = device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.paramsbuffer } },
            { binding: 1, resource: { buffer: this.clusterbuffer } },
            { binding: 2, resource: { buffer: this.selbuffer } },
            { binding: 3, resource: { buffer: this.flagsbuffer } },
            { binding: 4, resource: { buffer: this.residentbuffer } }
        ] });
    }
    select(camera, options) {
        this.ensuregpu();
        options = options || {};
        var threshold = options.threshold !== undefined ? options.threshold : 2;
        var viewportHeight = options.viewportHeight !== undefined ? options.viewportHeight : 600;
        var useCone = options.useCone !== false;
        var residencyOn = this.residentMask ? 1 : 0;
        var projection = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        var pe = projection.elements;
        var planes = [
            pe[3] + pe[0], pe[7] + pe[4], pe[11] + pe[8], pe[15] + pe[12],
            pe[3] - pe[0], pe[7] - pe[4], pe[11] - pe[8], pe[15] - pe[12],
            pe[3] + pe[1], pe[7] + pe[5], pe[11] + pe[9], pe[15] + pe[13],
            pe[3] - pe[1], pe[7] - pe[5], pe[11] - pe[9], pe[15] - pe[13],
            pe[2], pe[6], pe[10], pe[14],
            pe[3] - pe[2], pe[7] - pe[6], pe[11] - pe[10], pe[15] - pe[14]
        ];
        for (var pl = 0; pl < 6; pl++) {
            var ln = Math.sqrt(planes[pl * 4] * planes[pl * 4] + planes[pl * 4 + 1] * planes[pl * 4 + 1] + planes[pl * 4 + 2] * planes[pl * 4 + 2]) || 1;
            planes[pl * 4] /= ln; planes[pl * 4 + 1] /= ln; planes[pl * 4 + 2] /= ln; planes[pl * 4 + 3] /= ln;
        }
        var fov = 2 * Math.atan(1 / camera.projectionMatrix.elements[5]);
        var screenScale = viewportHeight / (2 * Math.tan(fov / 2));
        var count = this.clusters.length;
        var zeros = new Uint32Array(count);
        this.device.queue.writeBuffer(this.flagsbuffer, 0, zeros);
        var data = new Float32Array(36);
        data[0] = camera.position.x; data[1] = camera.position.y; data[2] = camera.position.z; data[3] = screenScale;
        for (var pp = 0; pp < 24; pp++) data[4 + pp] = planes[pp];
        data[32] = residencyOn;
        var t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
        for (var lr = 0; lr < this.levelRanges.length; lr++) {
            var range = this.levelRanges[lr];
            data[28] = range.count; data[29] = useCone ? 1 : 0; data[30] = threshold; data[31] = range.start;
            this.device.queue.writeBuffer(this.paramsbuffer, 0, data);
            var encoder = this.device.createCommandEncoder();
            var pass = encoder.beginComputePass();
            pass.setPipeline(this.pipeline);
            pass.setBindGroup(0, this.bind);
            pass.dispatchWorkgroups(Math.ceil(range.count / 64));
            pass.end();
            this.device.queue.submit([encoder.finish()]);
        }
        this.stats.selectms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
        return this;
    }
    readback() {
        var self = this;
        this.ensuregpu();
        var count = this.clusters.length;
        var encoder = this.device.createCommandEncoder();
        encoder.copyBufferToBuffer(this.selbuffer, 0, this.readbackbuffer, 0, Math.max(16, count * 4));
        this.device.queue.submit([encoder.finish()]);
        return this.device.queue.onSubmittedWorkDone().then(function() {
            return self.readbackbuffer.mapAsync(GPUMapMode.READ).then(function() {
                var out = new Uint32Array(self.readbackbuffer.getMappedRange()).slice();
                self.readbackbuffer.unmap();
                var sel = 0, selTris = 0;
                for (var i = 0; i < count; i++) {
                    if (out[i]) { sel++; selTris += self.clusters[i].triangles; }
                }
                self.stats.selected = sel;
                self.stats.selectedTriangles = selTris;
                self.lastSelection = out;
                return out;
            });
        });
    }
    selectedIndices(selection) {
        var sel = selection || this.lastSelection;
        if (!sel) return new Uint32Array(0);
        var total = 0;
        for (var i = 0; i < this.clusters.length; i++) {
            if (sel[i]) total += this.clusters[i].count;
        }
        var out = new Uint32Array(total);
        var cursor = 0;
        for (var j = 0; j < this.clusters.length; j++) {
            if (!sel[j]) continue;
            var c = this.clusters[j];
            for (var k = 0; k < c.count; k++) out[cursor++] = this.clusterIndices[c.first + k];
        }
        return out;
    }
    selectionGeometry(selection) {
        var out = new Geometry();
        out.setAttribute("position", new Float32Array(this.positions), 3);
        out.setAttribute("normal", new Float32Array(this.normals), 3);
        if (this.uvs) out.setAttribute("uv", new Float32Array(this.uvs), 2);
        out.setIndex(this.selectedIndices(selection));
        out.computeBounds();
        return out;
    }
    setMemoryBudget(clusterBudget) {
        this.memoryBudget = clusterBudget;
        if (!this.residentMask && this.renderer) {
            var count = this.clusters.length;
            this.residentMask = new Uint32Array(count);
            this.lastUsed = new Int32Array(count);
            for (var i = 0; i < count; i++) this.residentMask[i] = 1;
            for (var f = 0; f < count; f++) this.lastUsed[f] = -1;
            this.ensuregpu();
        }
        return this;
    }
    updateResidency(selection, frame) {
        if (!this.residentMask) return this;
        var count = this.clusters.length;
        var fr = frame !== undefined ? frame : this.frame;
        this.frame = fr + 1;
        var sel = selection || this.lastSelection;
        if (sel) {
            for (var i = 0; i < count; i++) {
                if (sel[i]) this.lastUsed[i] = fr;
            }
        }
        var order = [];
        for (var j = 0; j < count; j++) order.push(j);
        var self = this;
        order.sort(function(a, b) {
            if (self.lastUsed[a] !== self.lastUsed[b]) return self.lastUsed[b] - self.lastUsed[a];
            return a - b;
        });
        var budget = Math.min(this.memoryBudget, count);
        var keep = new Uint32Array(count);
        for (var k = 0; k < budget; k++) keep[order[k]] = 1;
        keep[count - 1] = 1;
        var residentCount = 0;
        for (var m = 0; m < count; m++) {
            this.residentMask[m] = keep[m];
            if (keep[m]) residentCount++;
        }
        this.stats.resident = residentCount;
        this.device.queue.writeBuffer(this.residentbuffer, 0, this.residentMask);
        return this;
    }
    dispose() {
        if (this.clusterbuffer) this.clusterbuffer.destroy();
        if (this.selbuffer) this.selbuffer.destroy();
        if (this.flagsbuffer) this.flagsbuffer.destroy();
        if (this.residentbuffer) this.residentbuffer.destroy();
        if (this.readbackbuffer) this.readbackbuffer.destroy();
        if (this.paramsbuffer) this.paramsbuffer.destroy();
        this.clusterbuffer = null;
        this.selbuffer = null;
        this.flagsbuffer = null;
        this.residentbuffer = null;
        this.readbackbuffer = null;
        this.paramsbuffer = null;
        this.pipeline = null;
        this.bind = null;
    }
}

export { FXOMVGS };
