import { faoxomgpureadbuffer } from "../core/index.js";

class GPUCullingPipeline {
    constructor(zaswa, zaswb) {
        this.device = zaswa;
        this.maxInstances = zaswb || 1e4;
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
        return `\n            struct InstanceData {\n                modelMatrix : mat4x4<f32>,\n                boundingSphere : vec4<f32>,\n            };\n            struct Uniforms {\n                viewProj : mat4x4<f32>,\n                frustumPlanes : array<vec4<f32>, 6>,\n                instanceCount : u32,\n            };\n            struct DrawIndexedIndirectArgs {\n                indexCount : u32,\n                instanceCount : atomic<u32>,\n                firstIndex : u32,\n                baseVertex : i32,\n                firstInstance : u32,\n            };\n            @group(0) @binding(0) var<uniform> uniforms : Uniforms;\n            @group(0) @binding(1) var<storage, read> instances : array<InstanceData>;\n            @group(0) @binding(2) var<storage, read_write> drawArgs : DrawIndexedIndirectArgs;\n            @group(0) @binding(3) var<storage, read_write> visibleIndices : array<u32>;\n\n            @compute @workgroup_size(64)\n            fn main(@builtin(global_invocation_id) id : vec3<u32>) {\n                let idx = id.x;\n                if (idx >= uniforms.instanceCount) { return; }\n                let sphere = instances[idx].boundingSphere;\n                var visible = true;\n                for (var p = 0u; p < 6u; p++) {\n                    let plane = uniforms.frustumPlanes[p];\n                    let dist = dot(plane.xyz, sphere.xyz) + plane.w;\n                    if (dist < -sphere.w) { visible = false; break; }\n                }\n                if (visible) {\n                    let outIdx = atomicAdd(&drawArgs.instanceCount, 1u);\n                    visibleIndices[outIdx] = idx;\n                }\n            }\n        `;
    }
    init() {
        if (!this.device || !this.device.createBuffer) return this;
        this.instanceBuffer = this.device.createBuffer({
            size: this.maxInstances * this.instanceStride + 15 & ~15,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.indirectBuffer = this.device.createBuffer({
            size: 20,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_SRC
        });
        this.instanceVisibilityBuffer = this.device.createBuffer({
            size: this.maxInstances * 4 + 15 & ~15,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        this.uniformBuffer = this.device.createBuffer({
            size: 176,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        var zaswa = this.device.createShaderModule({
            code: this.buildCullShader()
        });
        this.pipeline = this.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: zaswa,
                entryPoint: "main"
            }
        });
        this.bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.uniformBuffer
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.instanceBuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.indirectBuffer
                }
            }, {
                binding: 3,
                resource: {
                    buffer: this.instanceVisibilityBuffer
                }
            } ]
        });
        return this;
    }
    uploadInstances(zaswa) {
        if (!this.pipeline) this.init();
        var zaswb = Math.min(zaswa.length, this.maxInstances);
        var zaswc = new Float32Array(zaswb * 20);
        for (var zaswd = 0; zaswd < zaswb; zaswd++) {
            var zaswe = zaswa[zaswd];
            var zaswf = zaswe.matrix || zaswe;
            var zaswg = zaswe.boundingSphere || [ 0, 0, 0, 1 ];
            zaswc.set(zaswf.elements ? zaswf.elements : zaswf, zaswd * 20);
            zaswc[zaswd * 20 + 16] = zaswg[0];
            zaswc[zaswd * 20 + 17] = zaswg[1];
            zaswc[zaswd * 20 + 18] = zaswg[2];
            zaswc[zaswd * 20 + 19] = zaswg[3];
        }
        this.device.queue.writeBuffer(this.instanceBuffer, 0, zaswc);
        this.uploadedCount = zaswb;
        return this;
    }
    cull(zaswa, zaswb, zaswc) {
        if (!this.pipeline) this.init();
        var zaswd = zaswa && zaswa.elements ? zaswa.elements : zaswa;
        var zaswe = zaswc === undefined ? this.uploadedCount : Math.min(zaswc, this.maxInstances);
        var zaswf = this._uniformData;
        for (var zaswg = 0; zaswg < 16; zaswg++) zaswf[zaswg] = zaswd[zaswg];
        if (zaswb && zaswb.length >= 6) for (var zaswh = 0; zaswh < 6; zaswh++) {
            zaswf[16 + zaswh * 4] = zaswb[zaswh][0];
            zaswf[17 + zaswh * 4] = zaswb[zaswh][1];
            zaswf[18 + zaswh * 4] = zaswb[zaswh][2];
            zaswf[19 + zaswh * 4] = zaswb[zaswh][3];
        }
        this._uniformUint[40] = zaswe;
        this._drawArgsData[0] = 0;
        this._drawArgsData[1] = 0;
        this._drawArgsData[2] = 0;
        this._drawArgsData[3] = 0;
        this._drawArgsData[4] = 0;
        this.device.queue.writeBuffer(this.uniformBuffer, 0, zaswf);
        this.device.queue.writeBuffer(this.indirectBuffer, 0, this._drawArgsData);
        var zaswi = this.device.createCommandEncoder();
        var zaswj = zaswi.beginComputePass();
        zaswj.setPipeline(this.pipeline);
        zaswj.setBindGroup(0, this.bindGroup);
        zaswj.dispatchWorkgroups(Math.max(1, Math.ceil(zaswe / 64)));
        zaswj.end();
        this.device.queue.submit([ zaswi.finish() ]);
        this.culledCount = zaswe;
        return this;
    }
    readVisible() {
        var zaswa = this;
        return faoxomgpureadbuffer(this.device, this.indirectBuffer, 20).then(function(zaswb) {
            var zaswc = new Uint32Array(zaswb)[1];
            zaswc = Math.min(zaswc, zaswa.culledCount);
            if (zaswc <= 0) return {
                count: 0,
                indices: new Uint32Array(0)
            };
            return faoxomgpureadbuffer(zaswa.device, zaswa.instanceVisibilityBuffer, zaswc * 4).then(function(zaswa) {
                return {
                    count: zaswc,
                    indices: new Uint32Array(zaswa, 0, zaswc)
                };
            });
        });
    }
}

export { GPUCullingPipeline };
