var zahoa = "struct Aabb { min: vec4<f32>, max: vec4<f32> };\n@group(0) @binding(0) var<storage, read> aabbs: array<Aabb>;\n@group(0) @binding(1) var<storage, read_write> pairs: array<vec2<u32>>;\n@group(0) @binding(2) var<storage, read_write> counter: array<atomic<u32>>;\n@compute @workgroup_size(1)\nfn broadphaseMain(@builtin(global_invocation_id) gid: vec3<u32>) {\n    let i = gid.x;\n    let n = arrayLength(&aabbs);\n    if (i >= n) { return; }\n    let a = aabbs[i];\n    for (var j: u32 = i + 1u; j < n; j = j + 1u) {\n        let b = aabbs[j];\n        if (a.max.x >= b.min.x && b.max.x >= a.min.x && a.max.y >= b.min.y && b.max.y >= a.min.y && a.max.z >= b.min.z && b.max.z >= a.min.z) {\n            let slot = atomicAdd(&counter[0], 1u);\n            pairs[slot] = vec2<u32>(i, j);\n        }\n    }\n}";

class GPUBroadphase {
    constructor(zahoa) {
        this.device = zahoa && zahoa.device ? zahoa.device : zahoa;
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
    ensureResources(zahob, zahoc) {
        if (this.pipeline) return this;
        this.pipeline = this.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.device.createShaderModule({
                    code: zahoa
                }),
                entryPoint: "broadphaseMain"
            }
        });
        return this;
    }
    ensureCapacity(zahoa, zahob) {
        this.ensureResources();
        if (zahoa > this.bodyCapacity) {
            this.bodyCapacity = zahoa;
            if (this.aabbBuffer) this.aabbBuffer.destroy();
            this.aabbBuffer = this.device.createBuffer({
                size: Math.max(16, zahoa * 32),
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
        }
        if (zahob > this.pairCapacity) {
            this.pairCapacity = zahob;
            if (this.pairBuffer) this.pairBuffer.destroy();
            if (this.stagingBuffer) this.stagingBuffer.destroy();
            this.pairBuffer = this.device.createBuffer({
                size: Math.max(16, zahob * 8),
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
            });
            this.stagingBuffer = this.device.createBuffer({
                size: Math.max(256, Math.ceil((4 + zahob * 8) / 256) * 256),
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
        }
        if (!this.counterBuffer) this.counterBuffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        return this;
    }
    async update(zahoa) {
        var zahob = zahoa.bodies;
        var zahoc = zahob.length;
        if (!zahoc) {
            this.pairs = [];
            this.updateCount++;
            return this;
        }
        var zahod = zahoc * (zahoc - 1) / 2;
        this.ensureCapacity(zahoc, zahod);
        var zahoe = new Float32Array(zahoc * 8);
        var zahof = zahoa.fixedTimeStep;
        for (var zahog = 0; zahog < zahoc; zahog++) {
            var zahoh = zahob[zahog];
            var zahoi = zahoh.shape.getAABB(zahoh.position, null, zahoh.rotation);
            var zahoj = zahoh.isStatic || zahoh.sleeping ? .02 : zahoh.velocity.length() * zahof + .02;
            zahoe[zahog * 8] = zahoi.min.x - zahoj;
            zahoe[zahog * 8 + 1] = zahoi.min.y - zahoj;
            zahoe[zahog * 8 + 2] = zahoi.min.z - zahoj;
            zahoe[zahog * 8 + 3] = 1;
            zahoe[zahog * 8 + 4] = zahoi.max.x + zahoj;
            zahoe[zahog * 8 + 5] = zahoi.max.y + zahoj;
            zahoe[zahog * 8 + 6] = zahoi.max.z + zahoj;
            zahoe[zahog * 8 + 7] = 1;
        }
        this.device.queue.writeBuffer(this.aabbBuffer, 0, zahoe);
        this.device.queue.writeBuffer(this.counterBuffer, 0, new Uint32Array([ 0 ]));
        var zahok = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.aabbBuffer
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.pairBuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.counterBuffer
                }
            } ]
        });
        var zahol = this.device.createCommandEncoder();
        var zahom = zahol.beginComputePass();
        zahom.setPipeline(this.pipeline);
        zahom.setBindGroup(0, zahok);
        zahom.dispatchWorkgroups(zahoc);
        zahom.end();
        zahol.copyBufferToBuffer(this.counterBuffer, 0, this.stagingBuffer, 0, 4);
        zahol.copyBufferToBuffer(this.pairBuffer, 0, this.stagingBuffer, 4, zahod * 8);
        this.device.queue.submit([ zahol.finish() ]);
        await this.stagingBuffer.mapAsync(GPUMapMode.READ);
        var zahon = new Uint8Array(this.stagingBuffer.getMappedRange());
        var zahoo = new Uint32Array(zahon.buffer, zahon.byteOffset, zahon.byteLength / 4);
        var zahop = zahoo[0];
        var zahoq = [];
        for (var zahor = 0; zahor < zahop; zahor++) {
            var zahos = zahoo[1 + zahor * 2], zahot = zahoo[2 + zahor * 2];
            if (zahos < zahoc && zahot < zahoc && zahos < zahot) zahoq.push([ zahos, zahot ]);
        }
        this.stagingBuffer.unmap();
        zahoq.sort(function(zahoa, zahob) {
            return zahoa[0] - zahob[0] || zahoa[1] - zahob[1];
        });
        this.pairs = zahoq;
        this.updateCount++;
        return this;
    }
    bodyPairs(zahoa) {
        var zahob = [];
        var zahoc = zahoa.bodies;
        for (var zahod = 0; zahod < this.pairs.length; zahod++) {
            var zahoe = this.pairs[zahod];
            var zahof = zahoc[zahoe[0]], zahog = zahoc[zahoe[1]];
            if (zahof && zahog) zahob.push([ zahof, zahog ]);
        }
        return zahob;
    }
}

export { GPUBroadphase };
