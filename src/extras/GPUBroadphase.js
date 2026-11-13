var GPU_BROADPHASE_SHADER = "struct Aabb { min: vec4<f32>, max: vec4<f32> };\n@group(0) @binding(0) var<storage, read> aabbs: array<Aabb>;\n@group(0) @binding(1) var<storage, read_write> pairs: array<vec2<u32>>;\n@group(0) @binding(2) var<storage, read_write> counter: array<atomic<u32>>;\n@compute @workgroup_size(1)\nfn broadphaseMain(@builtin(global_invocation_id) gid: vec3<u32>) {\n    let i = gid.x;\n    let n = arrayLength(&aabbs);\n    if (i >= n) { return; }\n    let a = aabbs[i];\n    for (var j: u32 = i + 1u; j < n; j = j + 1u) {\n        let b = aabbs[j];\n        if (a.max.x >= b.min.x && b.max.x >= a.min.x && a.max.y >= b.min.y && b.max.y >= a.min.y && a.max.z >= b.min.z && b.max.z >= a.min.z) {\n            let slot = atomicAdd(&counter[0], 1u);\n            pairs[slot] = vec2<u32>(i, j);\n        }\n    }\n}";

class GPUBroadphase {
    constructor(renderer) {
        this.device = renderer && renderer.device ? renderer.device : renderer;
        this.pairs = [];
        this.updateCount = 0;
        this.bodyCapacity = 0;
        this.pairCapacity = 0;
        this.aabbBuffer = null;
        this.pairBuffer = null;
        this.counterBuffer = null;
        this.stagingBuffer = null;
        this.pipeline = null;
    }
    ensureResources(bodyCount, pairCount) {
        if (this.pipeline) return this;
        this.pipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: this.device.createShaderModule({ code: GPU_BROADPHASE_SHADER }), entryPoint: "broadphaseMain" } });
        return this;
    }
    ensureCapacity(bodyCount, pairCount) {
        this.ensureResources();
        if (bodyCount > this.bodyCapacity) {
            this.bodyCapacity = bodyCount;
            if (this.aabbBuffer) this.aabbBuffer.destroy();
            this.aabbBuffer = this.device.createBuffer({ size: Math.max(16, bodyCount * 32), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        }
        if (pairCount > this.pairCapacity) {
            this.pairCapacity = pairCount;
            if (this.pairBuffer) this.pairBuffer.destroy();
            if (this.stagingBuffer) this.stagingBuffer.destroy();
            this.pairBuffer = this.device.createBuffer({ size: Math.max(16, pairCount * 8), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
            this.stagingBuffer = this.device.createBuffer({ size: Math.max(256, Math.ceil((4 + pairCount * 8) / 256) * 256), usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        }
        if (!this.counterBuffer) this.counterBuffer = this.device.createBuffer({ size: 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        return this;
    }
    async update(world) {
        var bodies = world.bodies;
        var count = bodies.length;
        if (!count) { this.pairs = []; this.updateCount++; return this; }
        var maxPairs = count * (count - 1) / 2;
        this.ensureCapacity(count, maxPairs);
        var data = new Float32Array(count * 8);
        var marginBase = world.fixedTimeStep;
        for (var i = 0; i < count; i++) {
            var body = bodies[i];
            var box = body.shape.getAABB(body.position, null, body.rotation);
            var margin = (body.isStatic || body.sleeping ? 0.02 : body.velocity.length() * marginBase + 0.02);
            data[i * 8] = box.min.x - margin; data[i * 8 + 1] = box.min.y - margin; data[i * 8 + 2] = box.min.z - margin; data[i * 8 + 3] = 1;
            data[i * 8 + 4] = box.max.x + margin; data[i * 8 + 5] = box.max.y + margin; data[i * 8 + 6] = box.max.z + margin; data[i * 8 + 7] = 1;
        }
        this.device.queue.writeBuffer(this.aabbBuffer, 0, data);
        this.device.queue.writeBuffer(this.counterBuffer, 0, new Uint32Array([0]));
        var bindGroup = this.device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.aabbBuffer } },
            { binding: 1, resource: { buffer: this.pairBuffer } },
            { binding: 2, resource: { buffer: this.counterBuffer } }
        ] });
        var encoder = this.device.createCommandEncoder();
        var pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(count);
        pass.end();
        encoder.copyBufferToBuffer(this.counterBuffer, 0, this.stagingBuffer, 0, 4);
        encoder.copyBufferToBuffer(this.pairBuffer, 0, this.stagingBuffer, 4, maxPairs * 8);
        this.device.queue.submit([encoder.finish()]);
        await this.stagingBuffer.mapAsync(GPUMapMode.READ);
        var raw = new Uint8Array(this.stagingBuffer.getMappedRange());
        var words = new Uint32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
        var pairCount = words[0];
        var pairs = [];
        for (var p = 0; p < pairCount; p++) {
            var a = words[1 + p * 2], b = words[2 + p * 2];
            if (a < count && b < count && a < b) pairs.push([a, b]);
        }
        this.stagingBuffer.unmap();
        pairs.sort(function (x, y) { return x[0] - y[0] || x[1] - y[1]; });
        this.pairs = pairs;
        this.updateCount++;
        return this;
    }
    bodyPairs(world) {
        var result = [];
        var bodies = world.bodies;
        for (var i = 0; i < this.pairs.length; i++) {
            var pair = this.pairs[i];
            var a = bodies[pair[0]], b = bodies[pair[1]];
            if (a && b) result.push([a, b]);
        }
        return result;
    }
}

export { GPUBroadphase };
