import { BlindedInt32 } from "./ProtectedValue.js";

var zahqa = `\nstruct Vault {\n    values: array<f32>,\n};\n@group(0) @binding(0) var<storage, read_write> vault: Vault;\nstruct Params {\n    op: u32,\n    slot: u32,\n    operand: f32,\n    low: f32,\n    high: f32,\n};\n@group(0) @binding(1) var<uniform> params: Params;\n@compute @workgroup_size(1)\nfn main(@builtin(global_invocation_id) id: vec3<u32>) {\n    let slot = params.slot;\n    if (slot >= u32(arrayLength(&vault.values))) { return; }\n    let current = vault.values[slot];\n    var next = current;\n    switch params.op {\n        case 0u: { next = current + params.operand; }\n        case 1u: { next = current - params.operand; }\n        case 2u: { next = current * params.operand; }\n        case 3u: { next = clamp(current, params.low, params.high); }\n        case 4u: { next = min(current, params.operand); }\n        case 5u: { next = max(current, params.operand); }\n        case 6u: { next = params.operand; }\n        default: { next = current; }\n    }\n    vault.values[slot] = next;\n}\n`;

var zahqb = {
    add: 0,
    sub: 1,
    mul: 2,
    clamp: 3,
    min: 4,
    max: 5,
    set: 6
};

class GPUStateVault {
    constructor(zahqa) {
        zahqa = zahqa || {};
        this.capacity = Math.max(1, zahqa.capacity || 32);
        this.device = zahqa.device || null;
        this.buffer = null;
        this.uniform = null;
        this.pipeline = null;
        this.bindGroup = null;
        this.gpu = false;
        this._fallback = null;
        this._sealedWrites = 0;
        if (this.device) this._initGPU();
        if (!this.gpu) this._initFallback();
    }
    static async create(zahqa) {
        zahqa = zahqa || {};
        if (!zahqa.device && typeof navigator !== "undefined" && navigator.gpu) {
            try {
                var zahqb = await navigator.gpu.requestAdapter();
                if (zahqb) zahqa.device = await zahqb.requestDevice();
            } catch (zahqa) {}
        }
        return new GPUStateVault(zahqa);
    }
    _initGPU() {
        try {
            var zahqb = this.device;
            this.buffer = zahqb.createBuffer({
                size: this.capacity * 4,
                usage: 128 | 8 | 16 | 4
            });
            this.uniform = zahqb.createBuffer({
                size: 32,
                usage: 64 | 8
            });
            this.module = zahqb.createShaderModule({
                code: zahqa
            });
            this.pipeline = zahqb.createComputePipeline({
                layout: "auto",
                compute: {
                    module: this.module,
                    entryPoint: "main"
                }
            });
            this.bindGroup = zahqb.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [ {
                    binding: 0,
                    resource: {
                        buffer: this.buffer
                    }
                }, {
                    binding: 1,
                    resource: {
                        buffer: this.uniform
                    }
                } ]
            });
            this.gpu = true;
        } catch (zahqa) {
            this.gpu = false;
            this._initFallback();
        }
    }
    _initFallback() {
        this._fallback = [];
        for (var zahqa = 0; zahqa < this.capacity; zahqa++) this._fallback.push(new BlindedInt32(0));
    }
    set(zahqa, zahqc) {
        if (zahqa < 0 || zahqa >= this.capacity) throw new Error("GPUStateVault: slot out of range");
        this._apply(zahqb.set, zahqa, zahqc, 0, 0);
        return this;
    }
    add(zahqa, zahqc) {
        this._apply(zahqb.add, zahqa, zahqc, 0, 0);
        return this;
    }
    sub(zahqa, zahqc) {
        this._apply(zahqb.sub, zahqa, zahqc, 0, 0);
        return this;
    }
    mul(zahqa, zahqc) {
        this._apply(zahqb.mul, zahqa, zahqc, 0, 0);
        return this;
    }
    clamp(zahqa, zahqc, zahqd) {
        this._apply(zahqb.clamp, zahqa, 0, zahqc, zahqd);
        return this;
    }
    min(zahqa, zahqc) {
        this._apply(zahqb.min, zahqa, zahqc, 0, 0);
        return this;
    }
    max(zahqa, zahqc) {
        this._apply(zahqb.max, zahqa, zahqc, 0, 0);
        return this;
    }
    _apply(zahqa, zahqc, zahqd, zahqe, zahqf) {
        if (!this.gpu) {
            var zahqg = this._fallback[zahqc];
            if (zahqa === zahqb.set) zahqg._set(Math.round(zahqd)); else if (zahqa === zahqb.add) zahqg.add(Math.round(zahqd), true); else if (zahqa === zahqb.sub) zahqg.sub(Math.round(zahqd), true); else if (zahqa === zahqb.mul) zahqg._set(Math.round(zahqg.reveal() * zahqd)); else if (zahqa === zahqb.clamp) zahqg._set(Math.min(Math.max(Math.round(zahqe), zahqg.reveal()), Math.round(zahqf))); else if (zahqa === zahqb.min) zahqg._set(Math.min(zahqg.reveal(), Math.round(zahqd))); else if (zahqa === zahqb.max) zahqg._set(Math.max(zahqg.reveal(), Math.round(zahqd)));
            return;
        }
        var zahqh = new ArrayBuffer(32);
        var zahqi = new DataView(zahqh);
        zahqi.setUint32(0, zahqa, true);
        zahqi.setUint32(4, zahqc, true);
        zahqi.setFloat32(8, zahqd, true);
        zahqi.setFloat32(12, zahqe, true);
        zahqi.setFloat32(16, zahqf, true);
        var zahqj = this.device;
        zahqj.queue.writeBuffer(this.uniform, 0, zahqh);
        var zahqk = zahqj.createCommandEncoder();
        var zahql = zahqk.beginComputePass();
        zahql.setPipeline(this.pipeline);
        zahql.setBindGroup(0, this.bindGroup);
        zahql.dispatchWorkgroups(1);
        zahql.end();
        zahqj.queue.submit([ zahqk.finish() ]);
        this._sealedWrites++;
    }
    async unseal(zahqa) {
        if (zahqa < 0 || zahqa >= this.capacity) throw new Error("GPUStateVault: slot out of range");
        if (!this.gpu) return this._fallback[zahqa].reveal();
        var zahqb = this.device;
        var zahqc = zahqb.createBuffer({
            size: 4,
            usage: 8 | 1
        });
        var zahqd = zahqb.createCommandEncoder();
        zahqd.copyBufferToBuffer(this.buffer, zahqa * 4, zahqc, 0, 4);
        zahqb.queue.submit([ zahqd.finish() ]);
        await zahqc.mapAsync(1);
        var zahqe = new DataView(zahqc.getMappedRange()).getFloat32(0, true);
        zahqc.unmap();
        zahqc.destroy();
        return zahqe;
    }
    destroy() {
        if (this.gpu) {
            try {
                this.buffer.destroy();
            } catch (zahqa) {}
            try {
                this.uniform.destroy();
            } catch (zahqa) {}
        }
        this.gpu = false;
    }
}

export { GPUStateVault };
