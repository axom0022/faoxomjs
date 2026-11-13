import { faoxomgpureadbuffer } from "../core/index.js";

class GPUParticleComputeSystem {
    constructor(device, maxParticles) {
        this.device = device;
        this.maxParticles = maxParticles || 65536;
        this.particleBuffer = null;
        this.paramsBuffer = null;
        this.pipeline = null;
        this.bindGroup = null;
        this.particleCount = 0;
        this.stride = 8;
        this._paramsData = new Float32Array(4);
        this.computeShader = `
            struct Particle { pos: vec3<f32>, life: f32, vel: vec3<f32>, size: f32 };
            struct Params { deltaTime: f32, maxParticles: f32, respawnLife: f32, gravity: f32 };
            @group(0) @binding(0) var<storage, read_write> particles : array<Particle>;
            @group(0) @binding(1) var<uniform> params : Params;
            @compute @workgroup_size(64)
            fn main(@builtin(global_invocation_id) id : vec3<u32>) {
                let idx = id.x;
                if (idx >= u32(params.maxParticles)) { return; }
                var p = particles[idx];
                p.vel.y = p.vel.y - params.gravity * params.deltaTime;
                p.pos = p.pos + p.vel * params.deltaTime;
                p.life = p.life - params.deltaTime;
                if (p.life <= 0.0) { p.life = params.respawnLife; p.pos = vec3<f32>(0.0); }
                particles[idx] = p;
            }
        `;
    }
    init() {
        if (!this.device || !this.device.createBuffer) return this;
        this.particleBuffer = this.device.createBuffer({ size: (this.maxParticles * this.stride * 4 + 15) & ~15, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        this.paramsBuffer = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        var module = this.device.createShaderModule({ code: this.computeShader });
        this.pipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: module, entryPoint: "main" } });
        this.bindGroup = this.device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.particleBuffer } },
            { binding: 1, resource: { buffer: this.paramsBuffer } }
        ] });
        return this;
    }
    seed(count, particles) {
        if (!this.pipeline) this.init();
        count = Math.min(count || this.maxParticles, this.maxParticles);
        var data = new Float32Array(count * this.stride);
        for (var i = 0; i < count; i++) {
            var source = particles && particles[i];
            if (source) {
                data[i * 8] = source.position ? source.position[0] : (source[0] || 0);
                data[i * 8 + 1] = source.position ? source.position[1] : (source[1] || 0);
                data[i * 8 + 2] = source.position ? source.position[2] : (source[2] || 0);
                data[i * 8 + 3] = source.life !== undefined ? source.life : (source[3] !== undefined ? source[3] : 1);
                data[i * 8 + 4] = source.velocity ? source.velocity[0] : (source[4] || 0);
                data[i * 8 + 5] = source.velocity ? source.velocity[1] : (source[5] || 0);
                data[i * 8 + 6] = source.velocity ? source.velocity[2] : (source[6] || 0);
                data[i * 8 + 7] = source.size !== undefined ? source.size : (source[7] !== undefined ? source[7] : 1);
            } else {
                data[i * 8 + 3] = 1;
                data[i * 8 + 7] = 1;
            }
        }
        this.device.queue.writeBuffer(this.particleBuffer, 0, data);
        this.particleCount = count;
        return this;
    }
    update(deltaTime, options) {
        if (!this.pipeline) this.init();
        options = options || {};
        var gravity = options.gravity === undefined ? 0 : options.gravity;
        var respawnLife = options.respawnLife === undefined ? 2 : options.respawnLife;
        this._paramsData[0] = deltaTime;
        this._paramsData[1] = this.particleCount || this.maxParticles;
        this._paramsData[2] = respawnLife;
        this._paramsData[3] = gravity;
        this.device.queue.writeBuffer(this.paramsBuffer, 0, this._paramsData);
        var encoder = this.device.createCommandEncoder();
        var pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup);
        pass.dispatchWorkgroups(Math.max(1, Math.ceil((this.particleCount || this.maxParticles) / 64)));
        pass.end();
        this.device.queue.submit([encoder.finish()]);
        return this;
    }
    readParticles() {
        return faoxomgpureadbuffer(this.device, this.particleBuffer, (this.particleCount || this.maxParticles) * this.stride * 4);
    }
    getPositions() {
        return this.readParticles().then(function(buffer) { return new Float32Array(buffer); });
    }
    applyToAttribute(attribute) {
        return this.readParticles().then(function(buffer) {
            var values = new Float32Array(buffer);
            var array = attribute.array;
            var count = Math.min(array.length / 3, values.length / 8);
            for (var i = 0; i < count; i++) {
                array[i * 3] = values[i * 8];
                array[i * 3 + 1] = values[i * 8 + 1];
                array[i * 3 + 2] = values[i * 8 + 2];
            }
            attribute.needsUpdate = true;
            return attribute;
        });
    }
}

export { GPUParticleComputeSystem };
