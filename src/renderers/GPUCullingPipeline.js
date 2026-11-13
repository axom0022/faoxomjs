import { faoxomgpureadbuffer } from "../core/index.js";

class GPUCullingPipeline {
    constructor(device, maxInstances) {
        this.device = device;
        this.maxInstances = maxInstances || 10000;
        this.indirectBuffer = null;
        this.instanceVisibilityBuffer = null;
        this.instanceBuffer = null;
        this.uniformBuffer = null;
        this.pipeline = null;
        this.bindGroup = null;
        this.instanceStride = 80;
        this.uploadedCount = 0;
        this.culledCount = 0;
        this._uniformData = new Float32Array(44);
        this._uniformUint = new Uint32Array(this._uniformData.buffer);
        this._drawArgsData = new Uint32Array(5);
    }
    buildCullShader() {
        return `
            struct InstanceData {
                modelMatrix : mat4x4<f32>,
                boundingSphere : vec4<f32>,
            };
            struct Uniforms {
                viewProj : mat4x4<f32>,
                frustumPlanes : array<vec4<f32>, 6>,
                instanceCount : u32,
            };
            struct DrawIndexedIndirectArgs {
                indexCount : u32,
                instanceCount : atomic<u32>,
                firstIndex : u32,
                baseVertex : i32,
                firstInstance : u32,
            };
            @group(0) @binding(0) var<uniform> uniforms : Uniforms;
            @group(0) @binding(1) var<storage, read> instances : array<InstanceData>;
            @group(0) @binding(2) var<storage, read_write> drawArgs : DrawIndexedIndirectArgs;
            @group(0) @binding(3) var<storage, read_write> visibleIndices : array<u32>;

            @compute @workgroup_size(64)
            fn main(@builtin(global_invocation_id) id : vec3<u32>) {
                let idx = id.x;
                if (idx >= uniforms.instanceCount) { return; }
                let sphere = instances[idx].boundingSphere;
                var visible = true;
                for (var p = 0u; p < 6u; p++) {
                    let plane = uniforms.frustumPlanes[p];
                    let dist = dot(plane.xyz, sphere.xyz) + plane.w;
                    if (dist < -sphere.w) { visible = false; break; }
                }
                if (visible) {
                    let outIdx = atomicAdd(&drawArgs.instanceCount, 1u);
                    visibleIndices[outIdx] = idx;
                }
            }
        `;
    }
    init() {
        if (!this.device || !this.device.createBuffer) return this;
        this.instanceBuffer = this.device.createBuffer({ size: (this.maxInstances * this.instanceStride + 15) & ~15, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        this.indirectBuffer = this.device.createBuffer({ size: 20, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_SRC });
        this.instanceVisibilityBuffer = this.device.createBuffer({ size: (this.maxInstances * 4 + 15) & ~15, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        this.uniformBuffer = this.device.createBuffer({ size: 176, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        var module = this.device.createShaderModule({ code: this.buildCullShader() });
        this.pipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: module, entryPoint: "main" } });
        this.bindGroup = this.device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.uniformBuffer } },
            { binding: 1, resource: { buffer: this.instanceBuffer } },
            { binding: 2, resource: { buffer: this.indirectBuffer } },
            { binding: 3, resource: { buffer: this.instanceVisibilityBuffer } }
        ] });
        return this;
    }
    uploadInstances(instances) {
        if (!this.pipeline) this.init();
        var count = Math.min(instances.length, this.maxInstances);
        var data = new Float32Array(count * 20);
        for (var i = 0; i < count; i++) {
            var entry = instances[i];
            var matrix = entry.matrix || entry;
            var sphere = entry.boundingSphere || [0, 0, 0, 1];
            data.set(matrix.elements ? matrix.elements : matrix, i * 20);
            data[i * 20 + 16] = sphere[0];
            data[i * 20 + 17] = sphere[1];
            data[i * 20 + 18] = sphere[2];
            data[i * 20 + 19] = sphere[3];
        }
        this.device.queue.writeBuffer(this.instanceBuffer, 0, data);
        this.uploadedCount = count;
        return this;
    }
    cull(viewProjection, planes, count) {
        if (!this.pipeline) this.init();
        var elements = viewProjection && viewProjection.elements ? viewProjection.elements : viewProjection;
        var total = count === undefined ? this.uploadedCount : Math.min(count, this.maxInstances);
        var u = this._uniformData;
        for (var m = 0; m < 16; m++) u[m] = elements[m];
        if (planes && planes.length >= 6) for (var p = 0; p < 6; p++) { u[16 + p * 4] = planes[p][0]; u[17 + p * 4] = planes[p][1]; u[18 + p * 4] = planes[p][2]; u[19 + p * 4] = planes[p][3]; }
        this._uniformUint[40] = total;
        this._drawArgsData[0] = 0; this._drawArgsData[1] = 0; this._drawArgsData[2] = 0; this._drawArgsData[3] = 0; this._drawArgsData[4] = 0;
        this.device.queue.writeBuffer(this.uniformBuffer, 0, u);
        this.device.queue.writeBuffer(this.indirectBuffer, 0, this._drawArgsData);
        var encoder = this.device.createCommandEncoder();
        var pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup);
        pass.dispatchWorkgroups(Math.max(1, Math.ceil(total / 64)));
        pass.end();
        this.device.queue.submit([encoder.finish()]);
        this.culledCount = total;
        return this;
    }
    readVisible() {
        var self = this;
        return faoxomgpureadbuffer(this.device, this.indirectBuffer, 20).then(function(argsCopy) {
            var visible = new Uint32Array(argsCopy)[1];
            visible = Math.min(visible, self.culledCount);
            if (visible <= 0) return { count: 0, indices: new Uint32Array(0) };
            return faoxomgpureadbuffer(self.device, self.instanceVisibilityBuffer, visible * 4).then(function(indexCopy) {
                return { count: visible, indices: new Uint32Array(indexCopy, 0, visible) };
            });
        });
    }
}

export { GPUCullingPipeline };
