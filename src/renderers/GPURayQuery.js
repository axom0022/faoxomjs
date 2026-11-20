const RQCORE = `struct rqhit {\n    t: f32,\n    u: f32,\n    v: f32,\n    tri: u32,\n    nx: f32,\n    ny: f32,\n    nz: f32,\n};\n@group(0) @binding(1) var<storage, read> nodes: array<f32>;\n@group(0) @binding(2) var<storage, read> trilist: array<u32>;\n@group(0) @binding(3) var<storage, read> tridata: array<f32>;\nfn rqtrace(o: vec3<f32>, d: vec3<f32>) -> rqhit {\n    var inv = vec3<f32>(select(3.0e30, 1.0 / d.x, abs(d.x) > 1.0e-12), select(3.0e30, 1.0 / d.y, abs(d.y) > 1.0e-12), select(3.0e30, 1.0 / d.z, abs(d.z) > 1.0e-12));\n    var bestt = 3.0e38;\n    var besttri = 4294967295u;\n    var bestu = 0.0;\n    var bestv = 0.0;\n    var stack = array<i32, 64>();\n    stack[0] = 0;\n    var sp = 1;\n    while (sp > 0) {\n        sp = sp - 1;\n        var ni = u32(stack[sp]);\n        var t1 = (vec3<f32>(nodes[ni * 8u], nodes[ni * 8u + 1u], nodes[ni * 8u + 2u]) - o) * inv;\n        var t2 = (vec3<f32>(nodes[ni * 8u + 3u], nodes[ni * 8u + 4u], nodes[ni * 8u + 5u]) - o) * inv;\n        var tmin = min(t1, t2);\n        var tmax = max(t1, t2);\n        var enter = max(max(tmin.x, tmin.y), tmin.z);\n        var exitv = min(min(tmax.x, tmax.y), tmax.z);\n        if (enter > exitv || exitv < 0.0 || enter > bestt) {\n            continue;\n        }\n        var count = u32(nodes[ni * 8u + 7u]);\n        if (count > 0u) {\n            var first = u32(nodes[ni * 8u + 6u]);\n            for (var ti = 0u; ti < count; ti = ti + 1u) {\n                var gtri = trilist[first + ti];\n                var b = gtri * 12u;\n                var v0 = vec3<f32>(tridata[b], tridata[b + 1u], tridata[b + 2u]);\n                var v1 = vec3<f32>(tridata[b + 3u], tridata[b + 4u], tridata[b + 5u]);\n                var v2 = vec3<f32>(tridata[b + 6u], tridata[b + 7u], tridata[b + 8u]);\n                var e1 = v1 - v0;\n                var e2 = v2 - v0;\n                var pv = cross(d, e2);\n                var det = dot(e1, pv);\n                if (det > -1.0e-9 && det < 1.0e-9) {\n                    continue;\n                }\n                var invdet = 1.0 / det;\n                var tv = o - v0;\n                var uu = dot(tv, pv) * invdet;\n                if (uu < -1.0e-6 || uu > 1.000001) {\n                    continue;\n                }\n                var qv = cross(tv, e1);\n                var vv = dot(d, qv) * invdet;\n                if (vv < -1.0e-6 || uu + vv > 1.000001) {\n                    continue;\n                }\n                var t = dot(e2, qv) * invdet;\n                if (t > 1.0e-4 && t < bestt) {\n                    bestt = t;\n                    besttri = gtri;\n                    bestu = uu;\n                    bestv = vv;\n                }\n            }\n        } else {\n            var left = u32(nodes[ni * 8u + 6u]);\n            if (sp < 62) {\n                stack[sp] = i32(left + 1u);\n                sp = sp + 1;\n                stack[sp] = i32(left);\n                sp = sp + 1;\n            }\n        }\n    }\n    var result = rqhit(3.0e38, 0.0, 0.0, 4294967295u, 0.0, 0.0, 0.0);\n    if (besttri != 4294967295u) {\n        var bb = besttri * 12u;\n        var e1w = vec3<f32>(tridata[bb + 3u], tridata[bb + 4u], tridata[bb + 5u]) - vec3<f32>(tridata[bb], tridata[bb + 1u], tridata[bb + 2u]);\n        var e2w = vec3<f32>(tridata[bb + 6u], tridata[bb + 7u], tridata[bb + 8u]) - vec3<f32>(tridata[bb], tridata[bb + 1u], tridata[bb + 2u]);\n        var nrm = normalize(cross(e1w, e2w));\n        result = rqhit(bestt, bestu, bestv, besttri, nrm.x, nrm.y, nrm.z);\n    }\n    return result;\n}`;

const zatda = `struct rqparams {\n    counts: vec4<u32>,\n};\n@group(0) @binding(0) var<uniform> params: rqparams;\n${RQCORE}\n@group(0) @binding(4) var<storage, read> rays: array<f32>;\n@group(0) @binding(5) var<storage, read_write> hits: array<f32>;\n@compute @workgroup_size(64)\nfn tracemain(@builtin(global_invocation_id) gid: vec3<u32>) {\n    var r = gid.x;\n    if (r >= params.counts.x) {\n        return;\n    }\n    var o = vec3<f32>(rays[r * 6u], rays[r * 6u + 1u], rays[r * 6u + 2u]);\n    var d = vec3<f32>(rays[r * 6u + 3u], rays[r * 6u + 4u], rays[r * 6u + 5u]);\n    var hit = rqtrace(o, d);\n    var hb = r * 12u;\n    if (hit.tri == 4294967295u) {\n        hits[hb] = -1.0;\n        hits[hb + 1u] = 0.0;\n        hits[hb + 2u] = 0.0;\n        hits[hb + 3u] = 0.0;\n        hits[hb + 4u] = 0.0;\n        hits[hb + 5u] = 0.0;\n        hits[hb + 6u] = 0.0;\n        hits[hb + 7u] = 0.0;\n        hits[hb + 8u] = 0.0;\n        hits[hb + 9u] = 0.0;\n        hits[hb + 10u] = 0.0;\n        hits[hb + 11u] = 0.0;\n    } else {\n        var bb = hit.tri * 12u;\n        hits[hb] = hit.t;\n        hits[hb + 1u] = tridata[bb + 9u];\n        hits[hb + 2u] = tridata[bb + 10u];\n        hits[hb + 3u] = f32(hit.tri);\n        hits[hb + 4u] = hit.u;\n        hits[hb + 5u] = hit.v;\n        hits[hb + 6u] = hit.nx;\n        hits[hb + 7u] = hit.ny;\n        hits[hb + 8u] = hit.nz;\n        hits[hb + 9u] = 1.0;\n        hits[hb + 10u] = 0.0;\n        hits[hb + 11u] = 0.0;\n    }\n}`;

import { InstancedMesh } from "../objects/index.js";

class GPURayQuery {
    constructor(zatda) {
        this.renderer = zatda;
        this.device = zatda.device;
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
        this.stats = {
            objects: 0,
            instances: 0,
            triangles: 0,
            nodes: 0,
            leaves: 0,
            maxdepth: 0,
            buildms: 0,
            tracems: 0,
            rays: 0
        };
        this.nodestats = {
            nodes: 0,
            leaves: 0,
            maxdepth: 0
        };
    }
    ensurepipeline() {
        if (this.pipeline) return;
        this.pipeline = this.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.device.createShaderModule({
                    code: zatda
                }),
                entryPoint: "tracemain"
            }
        });
        this.parambuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.matrix = null;
    }
    build(zatda) {
        var zatdb = Date.now();
        this.ensurepipeline();
        if (!this.matrix) this.matrix = new Array(16);
        if (zatda && !zatda.length) zatda = [ zatda ];
        var zatdc = [];
        var zatdd = 0;
        var zatde = 0;
        for (var zatdf = 0; zatdf < zatda.length; zatdf++) {
            var zatdg = zatda[zatdf];
            var zatdh = zatdg.geometry;
            if (!zatdh || !zatdh.attributes || !zatdh.attributes.position) {
                zatdd++;
                continue;
            }
            var zatdi = zatdh.attributes.position.array;
            var zatdj = zatdh.index;
            var zatdk = zatdj ? zatdj.array ? zatdj.array : zatdj : null;
            var zatdl = zatdg.matrixWorld ? zatdg.matrixWorld.elements : null;
            var zatdm = zatdg instanceof InstancedMesh;
            var zatdn = zatdm ? Math.max(1, zatdg.count | 0) : 1;
            zatde += zatdn;
            for (var zatdo = 0; zatdo < zatdn; zatdo++) {
                var zatdp = zatdl;
                if (zatdm) {
                    var zatdq = zatdg.instanceMatrix.array;
                    var zatdr = zatdo * 16;
                    var zatds = this.matrix;
                    if (zatdl) {
                        for (var zatdt = 0; zatdt < 4; zatdt++) {
                            zatds[zatdt * 4 + 0] = zatdl[zatdt * 4 + 0] * zatdq[zatdr + 0] + zatdl[zatdt * 4 + 1] * zatdq[zatdr + 4] + zatdl[zatdt * 4 + 2] * zatdq[zatdr + 8] + zatdl[zatdt * 4 + 3] * zatdq[zatdr + 12];
                            zatds[zatdt * 4 + 1] = zatdl[zatdt * 4 + 0] * zatdq[zatdr + 1] + zatdl[zatdt * 4 + 1] * zatdq[zatdr + 5] + zatdl[zatdt * 4 + 2] * zatdq[zatdr + 9] + zatdl[zatdt * 4 + 3] * zatdq[zatdr + 13];
                            zatds[zatdt * 4 + 2] = zatdl[zatdt * 4 + 0] * zatdq[zatdr + 2] + zatdl[zatdt * 4 + 1] * zatdq[zatdr + 6] + zatdl[zatdt * 4 + 2] * zatdq[zatdr + 10] + zatdl[zatdt * 4 + 3] * zatdq[zatdr + 14];
                        }
                    } else {
                        for (var zatdu = 0; zatdu < 16; zatdu++) zatds[zatdu] = zatdq[zatdr + zatdu];
                    }
                    zatdp = zatds;
                }
                var zatdv = zatdk ? zatdk.length / 3 : zatdi.length / 9;
                for (var zatdw = 0; zatdw < zatdv; zatdw++) {
                    var zatdx = zatdk ? zatdk[zatdw * 3] : zatdw * 3;
                    var zatdy = zatdk ? zatdk[zatdw * 3 + 1] : zatdw * 3 + 1;
                    var zatdz = zatdk ? zatdk[zatdw * 3 + 2] : zatdw * 3 + 2;
                    for (var zatdaa = 0; zatdaa < 3; zatdaa++) {
                        var zatdab = zatdaa === 0 ? zatdx : zatdaa === 1 ? zatdy : zatdz;
                        var zatdac = zatdi[zatdab * 3], zatdad = zatdi[zatdab * 3 + 1], zatdae = zatdi[zatdab * 3 + 2];
                        if (zatdp) {
                            var zatdaf = zatdp[0] * zatdac + zatdp[4] * zatdad + zatdp[8] * zatdae + zatdp[12];
                            var zatdag = zatdp[1] * zatdac + zatdp[5] * zatdad + zatdp[9] * zatdae + zatdp[13];
                            var zatdah = zatdp[2] * zatdac + zatdp[6] * zatdad + zatdp[10] * zatdae + zatdp[14];
                            zatdac = zatdaf;
                            zatdad = zatdag;
                            zatdae = zatdah;
                        }
                        zatdc.push(zatdac, zatdad, zatdae);
                    }
                    zatdc.push(zatdd, zatdm ? zatdo : 0, 0);
                }
            }
            zatdd++;
        }
        var zatdai = zatdc.length / 12;
        var zatdaj = new Uint32Array(zatdai);
        var zatdak = zatdai > 0 ? zatdai * 2 + 1 : 0;
        var zatdal = new Float32Array(Math.max(8, zatdak * 8));
        var zatdam = {
            nodes: 0,
            leaves: 0,
            maxdepth: 0
        };
        if (zatdai > 0) this.buildnodes(zatdc, zatdai, zatdal, zatdaj, zatdam);
        this.stats.objects = zatda.length;
        this.stats.instances = zatde;
        this.stats.triangles = zatdai;
        this.stats.nodes = zatdam.nodes;
        this.stats.leaves = zatdam.leaves;
        this.stats.maxdepth = zatdam.maxdepth;
        if (this.nodebuffer) {
            this.nodebuffer.destroy();
            this.trilistbuffer.destroy();
            this.tridatabuffer.destroy();
        }
        this.nodebuffer = this.device.createBuffer({
            size: Math.max(32, zatdam.nodes * 32),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.trilistbuffer = this.device.createBuffer({
            size: Math.max(16, zatdai * 4),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.tridatabuffer = this.device.createBuffer({
            size: Math.max(48, zatdai * 48),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        if (zatdai > 0) {
            this.device.queue.writeBuffer(this.nodebuffer, 0, zatdal.subarray(0, zatdam.nodes * 8));
            this.device.queue.writeBuffer(this.trilistbuffer, 0, zatdaj);
            this.device.queue.writeBuffer(this.tridatabuffer, 0, new Float32Array(zatdc));
        }
        this.stats.buildms = Date.now() - zatdb;
        return this;
    }
    buildnodes(zatda, zatdb, zatdc, zatdd, zatde) {
        var zatdf = this;
        var zatdg = new Float32Array(zatdb * 3);
        for (var zatdh = 0; zatdh < zatdb; zatdh++) {
            zatdg[zatdh * 3] = (zatda[zatdh * 12] + zatda[zatdh * 12 + 3] + zatda[zatdh * 12 + 6]) / 3;
            zatdg[zatdh * 3 + 1] = (zatda[zatdh * 12 + 1] + zatda[zatdh * 12 + 4] + zatda[zatdh * 12 + 7]) / 3;
            zatdg[zatdh * 3 + 2] = (zatda[zatdh * 12 + 2] + zatda[zatdh * 12 + 5] + zatda[zatdh * 12 + 8]) / 3;
        }
        var zatdi = new Uint32Array(zatdb);
        for (var zatdj = 0; zatdj < zatdb; zatdj++) zatdi[zatdj] = zatdj;
        var zatdk = {
            next: 0
        };
        function zatdl(zatdb, zatdf, zatdh, zatdj) {
            if (zatdj > zatde.maxdepth) zatde.maxdepth = zatdj;
            var zatdm = 1e30, zatdn = 1e30, zatdo = 1e30, zatdp = -1e30, zatdq = -1e30, zatdr = -1e30;
            for (var zatds = zatdf; zatds < zatdh; zatds++) {
                var zatdt = zatdi[zatds];
                for (var zatdu = 0; zatdu < 3; zatdu++) {
                    var zatdv = zatda[zatdt * 12 + zatdu * 3], zatdw = zatda[zatdt * 12 + zatdu * 3 + 1], zatdx = zatda[zatdt * 12 + zatdu * 3 + 2];
                    if (zatdv < zatdm) zatdm = zatdv;
                    if (zatdw < zatdn) zatdn = zatdw;
                    if (zatdx < zatdo) zatdo = zatdx;
                    if (zatdv > zatdp) zatdp = zatdv;
                    if (zatdw > zatdq) zatdq = zatdw;
                    if (zatdx > zatdr) zatdr = zatdx;
                }
            }
            var zatdy = zatdh - zatdf;
            var zatdz = zatdb * 8;
            zatdc[zatdz] = zatdm;
            zatdc[zatdz + 1] = zatdn;
            zatdc[zatdz + 2] = zatdo;
            zatdc[zatdz + 3] = zatdp;
            zatdc[zatdz + 4] = zatdq;
            zatdc[zatdz + 5] = zatdr;
            if (zatdy <= 4 || zatdj >= 24) {
                var zatdaa = zatdk.next;
                for (var zatdab = zatdf; zatdab < zatdh; zatdab++) zatdd[zatdk.next++] = zatdi[zatdab];
                zatdc[zatdz + 6] = zatdaa;
                zatdc[zatdz + 7] = zatdy;
                zatde.leaves++;
                return zatdb;
            }
            var zatdac = 1e30, zatdad = 1e30, zatdae = 1e30, zatdaf = -1e30, zatdag = -1e30, zatdah = -1e30;
            for (var zatdai = zatdf; zatdai < zatdh; zatdai++) {
                var zatdaj = zatdi[zatdai];
                if (zatdg[zatdaj * 3] < zatdac) zatdac = zatdg[zatdaj * 3];
                if (zatdg[zatdaj * 3] > zatdaf) zatdaf = zatdg[zatdaj * 3];
                if (zatdg[zatdaj * 3 + 1] < zatdad) zatdad = zatdg[zatdaj * 3 + 1];
                if (zatdg[zatdaj * 3 + 1] > zatdag) zatdag = zatdg[zatdaj * 3 + 1];
                if (zatdg[zatdaj * 3 + 2] < zatdae) zatdae = zatdg[zatdaj * 3 + 2];
                if (zatdg[zatdaj * 3 + 2] > zatdah) zatdah = zatdg[zatdaj * 3 + 2];
            }
            var zatdak = zatdaf - zatdac, zatdal = zatdag - zatdad, zatdam = zatdah - zatdae;
            var zatdan = 0;
            var zatdao = zatdak;
            if (zatdal > zatdao) {
                zatdan = 1;
                zatdao = zatdal;
            }
            if (zatdam > zatdao) {
                zatdan = 2;
                zatdao = zatdam;
            }
            var zatdap = zatdan === 0 ? (zatdac + zatdaf) * .5 : zatdan === 1 ? (zatdad + zatdag) * .5 : (zatdae + zatdah) * .5;
            var zatdaq = zatdf;
            var zatdar = zatdh - 1;
            while (zatdaq <= zatdar) {
                var zatdas = zatdi[zatdaq];
                var zatdat = zatdan === 0 ? zatdg[zatdas * 3] : zatdan === 1 ? zatdg[zatdas * 3 + 1] : zatdg[zatdas * 3 + 2];
                if (zatdat < zatdap) zatdaq++; else {
                    var zatdau = zatdi[zatdaq];
                    zatdi[zatdaq] = zatdi[zatdar];
                    zatdi[zatdar] = zatdau;
                    zatdar--;
                }
            }
            if (zatdaq === zatdf || zatdaq === zatdh) zatdaq = Math.floor((zatdf + zatdh) / 2);
            var zatdav = zatde.nodes;
            zatde.nodes += 2;
            zatdl(zatdav, zatdf, zatdaq, zatdj + 1);
            zatdl(zatdav + 1, zatdaq, zatdh, zatdj + 1);
            zatdc[zatdz + 6] = zatdav;
            zatdc[zatdz + 7] = 0;
            return zatdb;
        }
        zatde.nodes = 1;
        zatdl(0, 0, zatdb, 0);
    }
    trace(zatda, zatdb, zatdc) {
        var zatdd = this;
        this.ensurepipeline();
        zatdc = zatdc || zatda.length / 3 | 0;
        this.stats.rays = zatdc;
        if (zatdc === 0) return Promise.resolve(new Float32Array(0));
        if (!this.nodebuffer || this.stats.triangles === 0) {
            var zatde = new Float32Array(zatdc * 12);
            for (var zatdf = 0; zatdf < zatdc; zatdf++) zatde[zatdf * 12] = -1;
            return Promise.resolve(zatde);
        }
        var zatdg = zatdc * 24;
        if (this.raycapacity < zatdc) {
            if (this.raybuffer) {
                this.raybuffer.destroy();
                this.hitbuffer.destroy();
                this.readback.destroy();
            }
            this.raycapacity = zatdc;
            this.raybuffer = this.device.createBuffer({
                size: zatdg,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            this.hitbuffer = this.device.createBuffer({
                size: zatdg * 2,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
            });
            this.readback = this.device.createBuffer({
                size: zatdg * 2,
                usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
            });
        }
        var zatdh = new Float32Array(zatdc * 6);
        for (var zatdi = 0; zatdi < zatdc; zatdi++) {
            zatdh[zatdi * 6] = zatda[zatdi * 3];
            zatdh[zatdi * 6 + 1] = zatda[zatdi * 3 + 1];
            zatdh[zatdi * 6 + 2] = zatda[zatdi * 3 + 2];
            zatdh[zatdi * 6 + 3] = zatdb[zatdi * 3];
            zatdh[zatdi * 6 + 4] = zatdb[zatdi * 3 + 1];
            zatdh[zatdi * 6 + 5] = zatdb[zatdi * 3 + 2];
        }
        this.device.queue.writeBuffer(this.raybuffer, 0, zatdh.subarray ? zatdh.subarray(0, zatdc * 6) : zatdh);
        this.device.queue.writeBuffer(this.parambuffer, 0, new Uint32Array([ zatdc, 0, 0, 0 ]));
        var zatdj = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.parambuffer
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.nodebuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.trilistbuffer
                }
            }, {
                binding: 3,
                resource: {
                    buffer: this.tridatabuffer
                }
            }, {
                binding: 4,
                resource: {
                    buffer: this.raybuffer
                }
            }, {
                binding: 5,
                resource: {
                    buffer: this.hitbuffer
                }
            } ]
        });
        var zatdk = performance.now();
        var zatdl = this.device.createCommandEncoder();
        var zatdm = zatdl.beginComputePass();
        zatdm.setPipeline(this.pipeline);
        zatdm.setBindGroup(0, zatdj);
        zatdm.dispatchWorkgroups(Math.ceil(zatdc / 64));
        zatdm.end();
        zatdl.copyBufferToBuffer(this.hitbuffer, 0, this.readback, 0, zatdc * 48);
        this.device.queue.submit([ zatdl.finish() ]);
        return this.device.queue.onSubmittedWorkDone().then(function() {
            return zatdd.readback.mapAsync(GPUMapMode.READ).then(function() {
                var zatda = new Float32Array(zatdd.readback.getMappedRange()).slice();
                zatdd.readback.unmap();
                zatdd.stats.tracems = performance.now() - zatdk;
                return zatda;
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
