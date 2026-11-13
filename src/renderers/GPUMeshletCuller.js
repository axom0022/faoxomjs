import { Matrix4 } from "../math/index.js";

const meshletcullwgsl = `struct mcparams {
    viewpos: vec4<f32>,
    planes: array<vec4<f32>, 6>,
    misc: vec4<f32>,
};
struct mrec {
    a: vec4<f32>,
    b: vec4<f32>,
    c: vec4<f32>,
    d: vec4<f32>,
    e: vec4<f32>,
    f: vec4<f32>,
};
@group(0) @binding(0) var<uniform> params: mcparams;
@group(0) @binding(1) var<storage, read> meshlets: array<mrec>;
@group(0) @binding(2) var<storage, read_write> visible: array<u32>;
@compute @workgroup_size(64)
fn cullmain(@builtin(global_invocation_id) gid: vec3<u32>) {
    if (gid.x >= u32(params.misc.x)) {
        return;
    }
    var m = meshlets[gid.x];
    var vis = 1u;
    if (params.misc.y > 0.5 && m.c.z > 0.5) {
        var u = params.viewpos.xyz - m.a.xyz;
        var r = length(u);
        if (r < 0.000001) {
            u = vec3<f32>(0.0, 1.0, 0.0);
            r = 1.0;
        } else {
            u = u / r;
        }
        var cosb = dot(u, m.b.xyz);
        var sinb = sqrt(max(0.0, 1.0 - cosb * cosb));
        var sintheta = sqrt(max(0.0, 1.0 - m.b.w * m.b.w));
        var bbound = cosb * m.b.w + sinb * sintheta;
        if (cosb < m.b.w && bbound < -1.0e-6 && r * (-bbound) >= m.a.w) {
            vis = 0u;
        }
    }
    if (vis == 1u) {
        var p = 0;
        loop {
            if (p >= 6) {
                break;
            }
            var dist = dot(params.planes[p].xyz, m.a.xyz) + params.planes[p].w;
            if (dist < -m.a.w) {
                vis = 0u;
            }
            p = p + 1;
        }
    }
    visible[gid.x] = vis;
}`;

class GPUMeshletCuller {
    constructor(renderer, meshletSet) {
        this.renderer = renderer;
        this.device = renderer.device;
        this.meshletSet = meshletSet;
        this.pipeline = null;
        this.paramsbuffer = null;
        this.meshletbuffer = null;
        this.visibility = null;
        this.readbackbuffer = null;
        this.bind = null;
        this.count = 0;
        this.stats = { cullms: 0, visible: 0, total: 0 };
        this.useCone = true;
    }
    ensurepipeline() {
        if (this.pipeline) return;
        this.pipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: this.device.createShaderModule({ code: meshletcullwgsl }), entryPoint: "cullmain" } });
        this.paramsbuffer = this.device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        var meshlets = this.meshletSet.meshlets;
        this.count = meshlets.length;
        var data = new Float32Array(this.count * 24);
        for (var i = 0; i < this.count; i++) {
            var m = meshlets[i];
            var b = i * 24;
            data[b] = m.center[0]; data[b + 1] = m.center[1]; data[b + 2] = m.center[2]; data[b + 3] = m.radius;
            data[b + 4] = m.axis[0]; data[b + 5] = m.axis[1]; data[b + 6] = m.axis[2]; data[b + 7] = m.cosThetaMax;
            data[b + 8] = m.first; data[b + 9] = m.count; data[b + 10] = m.cullable; data[b + 11] = 0;
            data[b + 12] = m.min[0]; data[b + 13] = m.min[1]; data[b + 14] = m.min[2]; data[b + 15] = 0;
            data[b + 16] = m.max[0]; data[b + 17] = m.max[1]; data[b + 18] = m.max[2]; data[b + 19] = 0;
            data[b + 20] = 0; data[b + 21] = 0; data[b + 22] = 0; data[b + 23] = 0;
        }
        this.meshletbuffer = this.device.createBuffer({ size: Math.max(16, this.count * 96), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        this.device.queue.writeBuffer(this.meshletbuffer, 0, data);
        this.visibility = this.device.createBuffer({ size: Math.max(16, this.count * 4), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
        this.readbackbuffer = this.device.createBuffer({ size: Math.max(16, this.count * 4), usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        this.bind = this.device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.paramsbuffer } },
            { binding: 1, resource: { buffer: this.meshletbuffer } },
            { binding: 2, resource: { buffer: this.visibility } }
        ] });
    }
    cull(camera) {
        this.ensurepipeline();
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
        var data = new Float32Array(32);
        data[0] = camera.position.x; data[1] = camera.position.y; data[2] = camera.position.z; data[3] = 0;
        for (var pp = 0; pp < 24; pp++) data[4 + pp] = planes[pp];
        data[28] = this.count; data[29] = this.useCone ? 1 : 0; data[30] = 0; data[31] = 0;
        this.device.queue.writeBuffer(this.paramsbuffer, 0, data);
        var t0 = performance.now();
        var encoder = this.device.createCommandEncoder();
        var pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bind);
        pass.dispatchWorkgroups(Math.ceil(this.count / 64));
        pass.end();
        this.device.queue.submit([encoder.finish()]);
        this.stats.cullms = performance.now() - t0;
        this.stats.total = this.count;
        return this;
    }
    readback() {
        var self = this;
        this.ensurepipeline();
        var encoder = this.device.createCommandEncoder();
        encoder.copyBufferToBuffer(this.visibility, 0, this.readbackbuffer, 0, Math.max(16, this.count * 4));
        this.device.queue.submit([encoder.finish()]);
        return this.device.queue.onSubmittedWorkDone().then(function() {
            return self.readbackbuffer.mapAsync(GPUMapMode.READ).then(function() {
                var out = new Uint32Array(self.readbackbuffer.getMappedRange()).slice();
                self.readbackbuffer.unmap();
                var vis = 0;
                for (var i = 0; i < self.count; i++) if (out[i]) vis++;
                self.stats.visible = vis;
                return out;
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
