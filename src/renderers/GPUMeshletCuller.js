import { Matrix4 } from "../math/index.js";

const zasza = `struct mcparams {\n    viewpos: vec4<f32>,\n    planes: array<vec4<f32>, 6>,\n    misc: vec4<f32>,\n};\nstruct mrec {\n    a: vec4<f32>,\n    b: vec4<f32>,\n    c: vec4<f32>,\n    d: vec4<f32>,\n    e: vec4<f32>,\n    f: vec4<f32>,\n};\n@group(0) @binding(0) var<uniform> params: mcparams;\n@group(0) @binding(1) var<storage, read> meshlets: array<mrec>;\n@group(0) @binding(2) var<storage, read_write> visible: array<u32>;\n@compute @workgroup_size(64)\nfn cullmain(@builtin(global_invocation_id) gid: vec3<u32>) {\n    if (gid.x >= u32(params.misc.x)) {\n        return;\n    }\n    var m = meshlets[gid.x];\n    var vis = 1u;\n    if (params.misc.y > 0.5 && m.c.z > 0.5) {\n        var u = params.viewpos.xyz - m.a.xyz;\n        var r = length(u);\n        if (r < 0.000001) {\n            u = vec3<f32>(0.0, 1.0, 0.0);\n            r = 1.0;\n        } else {\n            u = u / r;\n        }\n        var cosb = dot(u, m.b.xyz);\n        var sinb = sqrt(max(0.0, 1.0 - cosb * cosb));\n        var sintheta = sqrt(max(0.0, 1.0 - m.b.w * m.b.w));\n        var bbound = cosb * m.b.w + sinb * sintheta;\n        if (cosb < m.b.w && bbound < -1.0e-6 && r * (-bbound) >= m.a.w) {\n            vis = 0u;\n        }\n    }\n    if (vis == 1u) {\n        var p = 0;\n        loop {\n            if (p >= 6) {\n                break;\n            }\n            var dist = dot(params.planes[p].xyz, m.a.xyz) + params.planes[p].w;\n            if (dist < -m.a.w) {\n                vis = 0u;\n            }\n            p = p + 1;\n        }\n    }\n    visible[gid.x] = vis;\n}`;

class GPUMeshletCuller {
    constructor(zasza, zaszb) {
        this.renderer = zasza;
        this.device = zasza.device;
        this.meshletSet = zaszb;
        this.pipeline = null;
        this.paramsbuffer = null;
        this.meshletbuffer = null;
        this.visibility = null;
        this.readbackbuffer = null;
        this.bind = null;
        this.count = 0;
        this.stats = {
            cullms: 0,
            visible: 0,
            total: 0
        };
        this.useCone = true;
    }
    ensurepipeline() {
        if (this.pipeline) return;
        this.pipeline = this.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.device.createShaderModule({
                    code: zasza
                }),
                entryPoint: "cullmain"
            }
        });
        this.paramsbuffer = this.device.createBuffer({
            size: 128,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        var zaszb = this.meshletSet.meshlets;
        this.count = zaszb.length;
        var zaszc = new Float32Array(this.count * 24);
        for (var zaszd = 0; zaszd < this.count; zaszd++) {
            var zasze = zaszb[zaszd];
            var zaszf = zaszd * 24;
            zaszc[zaszf] = zasze.center[0];
            zaszc[zaszf + 1] = zasze.center[1];
            zaszc[zaszf + 2] = zasze.center[2];
            zaszc[zaszf + 3] = zasze.radius;
            zaszc[zaszf + 4] = zasze.axis[0];
            zaszc[zaszf + 5] = zasze.axis[1];
            zaszc[zaszf + 6] = zasze.axis[2];
            zaszc[zaszf + 7] = zasze.cosThetaMax;
            zaszc[zaszf + 8] = zasze.first;
            zaszc[zaszf + 9] = zasze.count;
            zaszc[zaszf + 10] = zasze.cullable;
            zaszc[zaszf + 11] = 0;
            zaszc[zaszf + 12] = zasze.min[0];
            zaszc[zaszf + 13] = zasze.min[1];
            zaszc[zaszf + 14] = zasze.min[2];
            zaszc[zaszf + 15] = 0;
            zaszc[zaszf + 16] = zasze.max[0];
            zaszc[zaszf + 17] = zasze.max[1];
            zaszc[zaszf + 18] = zasze.max[2];
            zaszc[zaszf + 19] = 0;
            zaszc[zaszf + 20] = 0;
            zaszc[zaszf + 21] = 0;
            zaszc[zaszf + 22] = 0;
            zaszc[zaszf + 23] = 0;
        }
        this.meshletbuffer = this.device.createBuffer({
            size: Math.max(16, this.count * 96),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.meshletbuffer, 0, zaszc);
        this.visibility = this.device.createBuffer({
            size: Math.max(16, this.count * 4),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        this.readbackbuffer = this.device.createBuffer({
            size: Math.max(16, this.count * 4),
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });
        this.bind = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.paramsbuffer
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.meshletbuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.visibility
                }
            } ]
        });
    }
    cull(zasza) {
        this.ensurepipeline();
        var zaszb = (new Matrix4).multiplyMatrices(zasza.projectionMatrix, zasza.matrixWorldInverse);
        var zaszc = zaszb.elements;
        var zaszd = [ zaszc[3] + zaszc[0], zaszc[7] + zaszc[4], zaszc[11] + zaszc[8], zaszc[15] + zaszc[12], zaszc[3] - zaszc[0], zaszc[7] - zaszc[4], zaszc[11] - zaszc[8], zaszc[15] - zaszc[12], zaszc[3] + zaszc[1], zaszc[7] + zaszc[5], zaszc[11] + zaszc[9], zaszc[15] + zaszc[13], zaszc[3] - zaszc[1], zaszc[7] - zaszc[5], zaszc[11] - zaszc[9], zaszc[15] - zaszc[13], zaszc[2], zaszc[6], zaszc[10], zaszc[14], zaszc[3] - zaszc[2], zaszc[7] - zaszc[6], zaszc[11] - zaszc[10], zaszc[15] - zaszc[14] ];
        for (var zasze = 0; zasze < 6; zasze++) {
            var zaszf = Math.sqrt(zaszd[zasze * 4] * zaszd[zasze * 4] + zaszd[zasze * 4 + 1] * zaszd[zasze * 4 + 1] + zaszd[zasze * 4 + 2] * zaszd[zasze * 4 + 2]) || 1;
            zaszd[zasze * 4] /= zaszf;
            zaszd[zasze * 4 + 1] /= zaszf;
            zaszd[zasze * 4 + 2] /= zaszf;
            zaszd[zasze * 4 + 3] /= zaszf;
        }
        var zaszg = new Float32Array(32);
        zaszg[0] = zasza.position.x;
        zaszg[1] = zasza.position.y;
        zaszg[2] = zasza.position.z;
        zaszg[3] = 0;
        for (var zaszh = 0; zaszh < 24; zaszh++) zaszg[4 + zaszh] = zaszd[zaszh];
        zaszg[28] = this.count;
        zaszg[29] = this.useCone ? 1 : 0;
        zaszg[30] = 0;
        zaszg[31] = 0;
        this.device.queue.writeBuffer(this.paramsbuffer, 0, zaszg);
        var zaszi = performance.now();
        var zaszj = this.device.createCommandEncoder();
        var zaszk = zaszj.beginComputePass();
        zaszk.setPipeline(this.pipeline);
        zaszk.setBindGroup(0, this.bind);
        zaszk.dispatchWorkgroups(Math.ceil(this.count / 64));
        zaszk.end();
        this.device.queue.submit([ zaszj.finish() ]);
        this.stats.cullms = performance.now() - zaszi;
        this.stats.total = this.count;
        return this;
    }
    readback() {
        var zasza = this;
        this.ensurepipeline();
        var zaszb = this.device.createCommandEncoder();
        zaszb.copyBufferToBuffer(this.visibility, 0, this.readbackbuffer, 0, Math.max(16, this.count * 4));
        this.device.queue.submit([ zaszb.finish() ]);
        return this.device.queue.onSubmittedWorkDone().then(function() {
            return zasza.readbackbuffer.mapAsync(GPUMapMode.READ).then(function() {
                var zaszb = new Uint32Array(zasza.readbackbuffer.getMappedRange()).slice();
                zasza.readbackbuffer.unmap();
                var zaszc = 0;
                for (var zaszd = 0; zaszd < zasza.count; zaszd++) if (zaszb[zaszd]) zaszc++;
                zasza.stats.visible = zaszc;
                return zaszb;
            });
        });
    }
    dispose() {
        if (this.meshletbuffer) this.meshletbuffer.destroy();
        if (this.visibility) this.visibility.destroy();
        if (this.readbackbuffer) this.readbackbuffer.destroy();
        if (this.paramsbuffer) this.paramsbuffer.destroy();
        this.meshletbuffer = null;
        this.visibility = null;
        this.readbackbuffer = null;
        this.paramsbuffer = null;
        this.pipeline = null;
        this.bind = null;
    }
}

export { GPUMeshletCuller };
