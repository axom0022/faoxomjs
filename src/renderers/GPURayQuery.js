const RQCORE = `struct rqhit {
    t: f32,
    u: f32,
    v: f32,
    tri: u32,
    nx: f32,
    ny: f32,
    nz: f32,
};
@group(0) @binding(1) var<storage, read> nodes: array<f32>;
@group(0) @binding(2) var<storage, read> trilist: array<u32>;
@group(0) @binding(3) var<storage, read> tridata: array<f32>;
fn rqtrace(o: vec3<f32>, d: vec3<f32>) -> rqhit {
    var inv = vec3<f32>(select(3.0e30, 1.0 / d.x, abs(d.x) > 1.0e-12), select(3.0e30, 1.0 / d.y, abs(d.y) > 1.0e-12), select(3.0e30, 1.0 / d.z, abs(d.z) > 1.0e-12));
    var bestt = 3.0e38;
    var besttri = 4294967295u;
    var bestu = 0.0;
    var bestv = 0.0;
    var stack = array<i32, 64>();
    stack[0] = 0;
    var sp = 1;
    while (sp > 0) {
        sp = sp - 1;
        var ni = u32(stack[sp]);
        var t1 = (vec3<f32>(nodes[ni * 8u], nodes[ni * 8u + 1u], nodes[ni * 8u + 2u]) - o) * inv;
        var t2 = (vec3<f32>(nodes[ni * 8u + 3u], nodes[ni * 8u + 4u], nodes[ni * 8u + 5u]) - o) * inv;
        var tmin = min(t1, t2);
        var tmax = max(t1, t2);
        var enter = max(max(tmin.x, tmin.y), tmin.z);
        var exitv = min(min(tmax.x, tmax.y), tmax.z);
        if (enter > exitv || exitv < 0.0 || enter > bestt) {
            continue;
        }
        var count = u32(nodes[ni * 8u + 7u]);
        if (count > 0u) {
            var first = u32(nodes[ni * 8u + 6u]);
            for (var ti = 0u; ti < count; ti = ti + 1u) {
                var gtri = trilist[first + ti];
                var b = gtri * 12u;
                var v0 = vec3<f32>(tridata[b], tridata[b + 1u], tridata[b + 2u]);
                var v1 = vec3<f32>(tridata[b + 3u], tridata[b + 4u], tridata[b + 5u]);
                var v2 = vec3<f32>(tridata[b + 6u], tridata[b + 7u], tridata[b + 8u]);
                var e1 = v1 - v0;
                var e2 = v2 - v0;
                var pv = cross(d, e2);
                var det = dot(e1, pv);
                if (det > -1.0e-9 && det < 1.0e-9) {
                    continue;
                }
                var invdet = 1.0 / det;
                var tv = o - v0;
                var uu = dot(tv, pv) * invdet;
                if (uu < -1.0e-6 || uu > 1.000001) {
                    continue;
                }
                var qv = cross(tv, e1);
                var vv = dot(d, qv) * invdet;
                if (vv < -1.0e-6 || uu + vv > 1.000001) {
                    continue;
                }
                var t = dot(e2, qv) * invdet;
                if (t > 1.0e-4 && t < bestt) {
                    bestt = t;
                    besttri = gtri;
                    bestu = uu;
                    bestv = vv;
                }
            }
        } else {
            var left = u32(nodes[ni * 8u + 6u]);
            if (sp < 62) {
                stack[sp] = i32(left + 1u);
                sp = sp + 1;
                stack[sp] = i32(left);
                sp = sp + 1;
            }
        }
    }
    var result = rqhit(3.0e38, 0.0, 0.0, 4294967295u, 0.0, 0.0, 0.0);
    if (besttri != 4294967295u) {
        var bb = besttri * 12u;
        var e1w = vec3<f32>(tridata[bb + 3u], tridata[bb + 4u], tridata[bb + 5u]) - vec3<f32>(tridata[bb], tridata[bb + 1u], tridata[bb + 2u]);
        var e2w = vec3<f32>(tridata[bb + 6u], tridata[bb + 7u], tridata[bb + 8u]) - vec3<f32>(tridata[bb], tridata[bb + 1u], tridata[bb + 2u]);
        var nrm = normalize(cross(e1w, e2w));
        result = rqhit(bestt, bestu, bestv, besttri, nrm.x, nrm.y, nrm.z);
    }
    return result;
}`;

const RQWGSL = `struct rqparams {
    counts: vec4<u32>,
};
@group(0) @binding(0) var<uniform> params: rqparams;
${RQCORE}
@group(0) @binding(4) var<storage, read> rays: array<f32>;
@group(0) @binding(5) var<storage, read_write> hits: array<f32>;
@compute @workgroup_size(64)
fn tracemain(@builtin(global_invocation_id) gid: vec3<u32>) {
    var r = gid.x;
    if (r >= params.counts.x) {
        return;
    }
    var o = vec3<f32>(rays[r * 6u], rays[r * 6u + 1u], rays[r * 6u + 2u]);
    var d = vec3<f32>(rays[r * 6u + 3u], rays[r * 6u + 4u], rays[r * 6u + 5u]);
    var hit = rqtrace(o, d);
    var hb = r * 12u;
    if (hit.tri == 4294967295u) {
        hits[hb] = -1.0;
        hits[hb + 1u] = 0.0;
        hits[hb + 2u] = 0.0;
        hits[hb + 3u] = 0.0;
        hits[hb + 4u] = 0.0;
        hits[hb + 5u] = 0.0;
        hits[hb + 6u] = 0.0;
        hits[hb + 7u] = 0.0;
        hits[hb + 8u] = 0.0;
        hits[hb + 9u] = 0.0;
        hits[hb + 10u] = 0.0;
        hits[hb + 11u] = 0.0;
    } else {
        var bb = hit.tri * 12u;
        hits[hb] = hit.t;
        hits[hb + 1u] = tridata[bb + 9u];
        hits[hb + 2u] = tridata[bb + 10u];
        hits[hb + 3u] = f32(hit.tri);
        hits[hb + 4u] = hit.u;
        hits[hb + 5u] = hit.v;
        hits[hb + 6u] = hit.nx;
        hits[hb + 7u] = hit.ny;
        hits[hb + 8u] = hit.nz;
        hits[hb + 9u] = 1.0;
        hits[hb + 10u] = 0.0;
        hits[hb + 11u] = 0.0;
    }
}`;

import { InstancedMesh } from "../objects/index.js";

class GPURayQuery {
    constructor(renderer) {
        this.renderer = renderer;
        this.device = renderer.device;
        this.pipeline = null;
        this.parambuffer = null;
        this.nodebuffer = null;
        this.trilistbuffer = null;
        this.tridatabuffer = null;
        this.raybuffer = null;
        this.hitbuffer = null;
        this.readback = null;
        this.raycapacity = 0;
        this.matrix = null;
        this.instmatrix = null;
        this.stats = { objects: 0, instances: 0, triangles: 0, nodes: 0, leaves: 0, maxdepth: 0, buildms: 0, tracems: 0, rays: 0 };
        this.nodestats = { nodes: 0, leaves: 0, maxdepth: 0 };
    }
    ensurepipeline() {
        if (this.pipeline) return;
        this.pipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: this.device.createShaderModule({ code: RQWGSL }), entryPoint: "tracemain" } });
        this.parambuffer = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.matrix = null;
    }
    build(objects) {
        var t0 = Date.now();
        this.ensurepipeline();
        if (!this.matrix) this.matrix = new Array(16);
        if (objects && !objects.length) objects = [objects];
        var tris = [];
        var objid = 0;
        var instances = 0;
        for (var oi = 0; oi < objects.length; oi++) {
            var object = objects[oi];
            var geometry = object.geometry;
            if (!geometry || !geometry.attributes || !geometry.attributes.position) { objid++; continue; }
            var pos = geometry.attributes.position.array;
            var idxraw = geometry.index;
            var idx = idxraw ? (idxraw.array ? idxraw.array : idxraw) : null;
            var world = object.matrixWorld ? object.matrixWorld.elements : null;
            var isinst = object instanceof InstancedMesh;
            var icount = isinst ? Math.max(1, object.count | 0) : 1;
            instances += icount;
            for (var ic = 0; ic < icount; ic++) {
                var m = world;
                if (isinst) {
                    var im = object.instanceMatrix.array;
                    var base = ic * 16;
                    var wm = this.matrix;
                    if (world) {
                        for (var c = 0; c < 4; c++) {
                            wm[c * 4 + 0] = world[c * 4 + 0] * im[base + 0] + world[c * 4 + 1] * im[base + 4] + world[c * 4 + 2] * im[base + 8] + world[c * 4 + 3] * im[base + 12];
                            wm[c * 4 + 1] = world[c * 4 + 0] * im[base + 1] + world[c * 4 + 1] * im[base + 5] + world[c * 4 + 2] * im[base + 9] + world[c * 4 + 3] * im[base + 13];
                            wm[c * 4 + 2] = world[c * 4 + 0] * im[base + 2] + world[c * 4 + 1] * im[base + 6] + world[c * 4 + 2] * im[base + 10] + world[c * 4 + 3] * im[base + 14];
                        }
                    } else {
                        for (var c2 = 0; c2 < 16; c2++) wm[c2] = im[base + c2];
                    }
                    m = wm;
                }
                var triCount = idx ? idx.length / 3 : pos.length / 9;
                for (var t = 0; t < triCount; t++) {
                    var i0 = idx ? idx[t * 3] : t * 3;
                    var i1 = idx ? idx[t * 3 + 1] : t * 3 + 1;
                    var i2 = idx ? idx[t * 3 + 2] : t * 3 + 2;
                    for (var v = 0; v < 3; v++) {
                        var vi = v === 0 ? i0 : v === 1 ? i1 : i2;
                        var x = pos[vi * 3], y = pos[vi * 3 + 1], z = pos[vi * 3 + 2];
                        if (m) {
                            var wx = m[0] * x + m[4] * y + m[8] * z + m[12];
                            var wy = m[1] * x + m[5] * y + m[9] * z + m[13];
                            var wz = m[2] * x + m[6] * y + m[10] * z + m[14];
                            x = wx; y = wy; z = wz;
                        }
                        tris.push(x, y, z);
                    }
                    tris.push(objid, isinst ? ic : 0, 0);
                }
            }
            objid++;
        }
        var triTotal = tris.length / 12;
        var trilist = new Uint32Array(triTotal);
        var nodecount = triTotal > 0 ? triTotal * 2 + 1 : 0;
        var nodedata = new Float32Array(Math.max(8, nodecount * 8));
        var nodestats = { nodes: 0, leaves: 0, maxdepth: 0 };
        if (triTotal > 0) this.buildnodes(tris, triTotal, nodedata, trilist, nodestats);
        this.stats.objects = objects.length;
        this.stats.instances = instances;
        this.stats.triangles = triTotal;
        this.stats.nodes = nodestats.nodes;
        this.stats.leaves = nodestats.leaves;
        this.stats.maxdepth = nodestats.maxdepth;
        if (this.nodebuffer) { this.nodebuffer.destroy(); this.trilistbuffer.destroy(); this.tridatabuffer.destroy(); }
        this.nodebuffer = this.device.createBuffer({ size: Math.max(32, nodestats.nodes * 32), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        this.trilistbuffer = this.device.createBuffer({ size: Math.max(16, triTotal * 4), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        this.tridatabuffer = this.device.createBuffer({ size: Math.max(48, triTotal * 48), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        if (triTotal > 0) {
            this.device.queue.writeBuffer(this.nodebuffer, 0, nodedata.subarray(0, nodestats.nodes * 8));
            this.device.queue.writeBuffer(this.trilistbuffer, 0, trilist);
            this.device.queue.writeBuffer(this.tridatabuffer, 0, new Float32Array(tris));
        }
        this.stats.buildms = Date.now() - t0;
        return this;
    }
    buildnodes(tris, triTotal, nodedata, trilist, nodestats) {
        var self = this;
        var centroids = new Float32Array(triTotal * 3);
        for (var t = 0; t < triTotal; t++) {
            centroids[t * 3] = (tris[t * 12] + tris[t * 12 + 3] + tris[t * 12 + 6]) / 3;
            centroids[t * 3 + 1] = (tris[t * 12 + 1] + tris[t * 12 + 4] + tris[t * 12 + 7]) / 3;
            centroids[t * 3 + 2] = (tris[t * 12 + 2] + tris[t * 12 + 5] + tris[t * 12 + 8]) / 3;
        }
        var order = new Uint32Array(triTotal);
        for (var i = 0; i < triTotal; i++) order[i] = i;
        var cursor = { next: 0 };
        function emit(nodeindex, start, end, depth) {
            if (depth > nodestats.maxdepth) nodestats.maxdepth = depth;
            var minx = 1e30, miny = 1e30, minz = 1e30, maxx = -1e30, maxy = -1e30, maxz = -1e30;
            for (var i = start; i < end; i++) {
                var g = order[i];
                for (var v = 0; v < 3; v++) {
                    var x = tris[g * 12 + v * 3], y = tris[g * 12 + v * 3 + 1], z = tris[g * 12 + v * 3 + 2];
                    if (x < minx) minx = x;
                    if (y < miny) miny = y;
                    if (z < minz) minz = z;
                    if (x > maxx) maxx = x;
                    if (y > maxy) maxy = y;
                    if (z > maxz) maxz = z;
                }
            }
            var count = end - start;
            var b = nodeindex * 8;
            nodedata[b] = minx; nodedata[b + 1] = miny; nodedata[b + 2] = minz;
            nodedata[b + 3] = maxx; nodedata[b + 4] = maxy; nodedata[b + 5] = maxz;
            if (count <= 4 || depth >= 24) {
                var first = cursor.next;
                for (var w = start; w < end; w++) trilist[cursor.next++] = order[w];
                nodedata[b + 6] = first;
                nodedata[b + 7] = count;
                nodestats.leaves++;
                return nodeindex;
            }
            var cminx = 1e30, cminy = 1e30, cminz = 1e30, cmaxx = -1e30, cmaxy = -1e30, cmaxz = -1e30;
            for (var c = start; c < end; c++) {
                var g2 = order[c];
                if (centroids[g2 * 3] < cminx) cminx = centroids[g2 * 3];
                if (centroids[g2 * 3] > cmaxx) cmaxx = centroids[g2 * 3];
                if (centroids[g2 * 3 + 1] < cminy) cminy = centroids[g2 * 3 + 1];
                if (centroids[g2 * 3 + 1] > cmaxy) cmaxy = centroids[g2 * 3 + 1];
                if (centroids[g2 * 3 + 2] < cminz) cminz = centroids[g2 * 3 + 2];
                if (centroids[g2 * 3 + 2] > cmaxz) cmaxz = centroids[g2 * 3 + 2];
            }
            var ex = cmaxx - cminx, ey = cmaxy - cminy, ez = cmaxz - cminz;
            var axis = 0;
            var ext = ex;
            if (ey > ext) { axis = 1; ext = ey; }
            if (ez > ext) { axis = 2; ext = ez; }
            var mid = axis === 0 ? (cminx + cmaxx) * 0.5 : axis === 1 ? (cminy + cmaxy) * 0.5 : (cminz + cmaxz) * 0.5;
            var left = start;
            var right = end - 1;
            while (left <= right) {
                var g3 = order[left];
                var cv = axis === 0 ? centroids[g3 * 3] : axis === 1 ? centroids[g3 * 3 + 1] : centroids[g3 * 3 + 2];
                if (cv < mid) left++;
                else {
                    var tmp = order[left];
                    order[left] = order[right];
                    order[right] = tmp;
                    right--;
                }
            }
            if (left === start || left === end) left = Math.floor((start + end) / 2);
            var lidx = nodestats.nodes;
            nodestats.nodes += 2;
            emit(lidx, start, left, depth + 1);
            emit(lidx + 1, left, end, depth + 1);
            nodedata[b + 6] = lidx;
            nodedata[b + 7] = 0;
            return nodeindex;
        }
        nodestats.nodes = 1;
        emit(0, 0, triTotal, 0);
    }
    trace(origins, directions, count) {
        var self = this;
        this.ensurepipeline();
        count = count || (origins.length / 3) | 0;
        this.stats.rays = count;
        if (count === 0) return Promise.resolve(new Float32Array(0));
        if (!this.nodebuffer || this.stats.triangles === 0) {
            var missall = new Float32Array(count * 12);
            for (var mi = 0; mi < count; mi++) missall[mi * 12] = -1;
            return Promise.resolve(missall);
        }
        var needed = count * 24;
        if (this.raycapacity < count) {
            if (this.raybuffer) { this.raybuffer.destroy(); this.hitbuffer.destroy(); this.readback.destroy(); }
            this.raycapacity = count;
            this.raybuffer = this.device.createBuffer({ size: needed, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
            this.hitbuffer = this.device.createBuffer({ size: needed * 2, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
            this.readback = this.device.createBuffer({ size: needed * 2, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        }
        var rays = new Float32Array(count * 6);
        for (var i = 0; i < count; i++) {
            rays[i * 6] = origins[i * 3];
            rays[i * 6 + 1] = origins[i * 3 + 1];
            rays[i * 6 + 2] = origins[i * 3 + 2];
            rays[i * 6 + 3] = directions[i * 3];
            rays[i * 6 + 4] = directions[i * 3 + 1];
            rays[i * 6 + 5] = directions[i * 3 + 2];
        }
        this.device.queue.writeBuffer(this.raybuffer, 0, rays.subarray ? rays.subarray(0, count * 6) : rays);
        this.device.queue.writeBuffer(this.parambuffer, 0, new Uint32Array([count, 0, 0, 0]));
        var bind = this.device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.parambuffer } },
            { binding: 1, resource: { buffer: this.nodebuffer } },
            { binding: 2, resource: { buffer: this.trilistbuffer } },
            { binding: 3, resource: { buffer: this.tridatabuffer } },
            { binding: 4, resource: { buffer: this.raybuffer } },
            { binding: 5, resource: { buffer: this.hitbuffer } }
        ] });
        var t0 = performance.now();
        var encoder = this.device.createCommandEncoder();
        var pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, bind);
        pass.dispatchWorkgroups(Math.ceil(count / 64));
        pass.end();
        encoder.copyBufferToBuffer(this.hitbuffer, 0, this.readback, 0, count * 48);
        this.device.queue.submit([encoder.finish()]);
        return this.device.queue.onSubmittedWorkDone().then(function() {
            return self.readback.mapAsync(GPUMapMode.READ).then(function() {
                var out = new Float32Array(self.readback.getMappedRange()).slice();
                self.readback.unmap();
                self.stats.tracems = performance.now() - t0;
                return out;
            });
        });
    }
    dispose() {
        if (this.nodebuffer) this.nodebuffer.destroy();
        if (this.trilistbuffer) this.trilistbuffer.destroy();
        if (this.tridatabuffer) this.tridatabuffer.destroy();
        if (this.raybuffer) this.raybuffer.destroy();
        if (this.hitbuffer) this.hitbuffer.destroy();
        if (this.readback) this.readback.destroy();
        if (this.parambuffer) this.parambuffer.destroy();
        this.nodebuffer = null;
        this.trilistbuffer = null;
        this.tridatabuffer = null;
        this.raybuffer = null;
        this.hitbuffer = null;
        this.readback = null;
        this.parambuffer = null;
        this.raycapacity = 0;
    }
}

export { GPURayQuery, RQCORE };
