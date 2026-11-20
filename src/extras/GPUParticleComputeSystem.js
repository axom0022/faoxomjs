import { faoxomgpureadbuffer } from "../core/index.js";

class GPUParticleComputeSystem {
    constructor(zahpa, zahpb) {
        this.device = zahpa;
        this.maxParticles = zahpb || 65536;
        this.particleBuffer = null;
        this.paramsBuffer = null;
        this.pipeline = null;
        this.bindGroup = null;
        this.particleCount = 0;
        this.stride = 8;
        this._paramsData = new Float32Array(4);
        this.computeShader = `\n            struct Particle { pos: vec3<f32>, life: f32, vel: vec3<f32>, size: f32 };\n            struct Params { deltaTime: f32, maxParticles: f32, respawnLife: f32, gravity: f32 };\n            @group(0) @binding(0) var<storage, read_write> particles : array<Particle>;\n            @group(0) @binding(1) var<uniform> params : Params;\n            @compute @workgroup_size(64)\n            fn main(@builtin(global_invocation_id) id : vec3<u32>) {\n                let idx = id.x;\n                if (idx >= u32(params.maxParticles)) { return; }\n                var p = particles[idx];\n                p.vel.y = p.vel.y - params.gravity * params.deltaTime;\n                p.pos = p.pos + p.vel * params.deltaTime;\n                p.life = p.life - params.deltaTime;\n                if (p.life <= 0.0) { p.life = params.respawnLife; p.pos = vec3<f32>(0.0); }\n                particles[idx] = p;\n            }\n        `;
    }
    init() {
        if (!this.device || !this.device.createBuffer) return this;
        this.particleBuffer = this.device.createBuffer({
            size: this.maxParticles * this.stride * 4 + 15 & ~15,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        this.paramsBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        var zahpa = this.device.createShaderModule({
            code: this.computeShader
        });
        this.pipeline = this.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: zahpa,
                entryPoint: "main"
            }
        });
        this.bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.particleBuffer
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.paramsBuffer
                }
            } ]
        });
        return this;
    }
    seed(zahpa, zahpb) {
        if (!this.pipeline) this.init();
        zahpa = Math.min(zahpa || this.maxParticles, this.maxParticles);
        var zahpc = new Float32Array(zahpa * this.stride);
        for (var zahpd = 0; zahpd < zahpa; zahpd++) {
            var zahpe = zahpb && zahpb[zahpd];
            if (zahpe) {
                zahpc[zahpd * 8] = zahpe.position ? zahpe.position[0] : zahpe[0] || 0;
                zahpc[zahpd * 8 + 1] = zahpe.position ? zahpe.position[1] : zahpe[1] || 0;
                zahpc[zahpd * 8 + 2] = zahpe.position ? zahpe.position[2] : zahpe[2] || 0;
                zahpc[zahpd * 8 + 3] = zahpe.life !== undefined ? zahpe.life : zahpe[3] !== undefined ? zahpe[3] : 1;
                zahpc[zahpd * 8 + 4] = zahpe.velocity ? zahpe.velocity[0] : zahpe[4] || 0;
                zahpc[zahpd * 8 + 5] = zahpe.velocity ? zahpe.velocity[1] : zahpe[5] || 0;
                zahpc[zahpd * 8 + 6] = zahpe.velocity ? zahpe.velocity[2] : zahpe[6] || 0;
                zahpc[zahpd * 8 + 7] = zahpe.size !== undefined ? zahpe.size : zahpe[7] !== undefined ? zahpe[7] : 1;
            } else {
                zahpc[zahpd * 8 + 3] = 1;
                zahpc[zahpd * 8 + 7] = 1;
            }
        }
        this.device.queue.writeBuffer(this.particleBuffer, 0, zahpc);
        this.particleCount = zahpa;
        return this;
    }
    update(zahpa, zahpb) {
        if (!this.pipeline) this.init();
        zahpb = zahpb || {};
        var zahpc = zahpb.gravity === undefined ? 0 : zahpb.gravity;
        var zahpd = zahpb.respawnLife === undefined ? 2 : zahpb.respawnLife;
        this._paramsData[0] = zahpa;
        this._paramsData[1] = this.particleCount || this.maxParticles;
        this._paramsData[2] = zahpd;
        this._paramsData[3] = zahpc;
        this.device.queue.writeBuffer(this.paramsBuffer, 0, this._paramsData);
        var zahpe = this.device.createCommandEncoder();
        var zahpf = zahpe.beginComputePass();
        zahpf.setPipeline(this.pipeline);
        zahpf.setBindGroup(0, this.bindGroup);
        zahpf.dispatchWorkgroups(Math.max(1, Math.ceil((this.particleCount || this.maxParticles) / 64)));
        zahpf.end();
        this.device.queue.submit([ zahpe.finish() ]);
        return this;
    }
    readParticles() {
        return faoxomgpureadbuffer(this.device, this.particleBuffer, (this.particleCount || this.maxParticles) * this.stride * 4);
    }
    getPositions() {
        return this.readParticles().then(function(zahpa) {
            return new Float32Array(zahpa);
        });
    }
    applyToAttribute(zahpa) {
        return this.readParticles().then(function(zahpb) {
            var zahpc = new Float32Array(zahpb);
            var zahpd = zahpa.array;
            var zahpe = Math.min(zahpd.length / 3, zahpc.length / 8);
            for (var zahpf = 0; zahpf < zahpe; zahpf++) {
                zahpd[zahpf * 3] = zahpc[zahpf * 8];
                zahpd[zahpf * 3 + 1] = zahpc[zahpf * 8 + 1];
                zahpd[zahpf * 3 + 2] = zahpc[zahpf * 8 + 2];
            }
            zahpa.needsUpdate = true;
            return zahpa;
        });
    }
}

export { GPUParticleComputeSystem };
