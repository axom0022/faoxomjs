// GPUStateVault - keeps authoritative gameplay numbers in GPU VRAM. The
// private buffer is created without MAP_READ|MAP_WRITE so the CPU cannot
// read it back; mutations run in a compute shader. Values only return to the
// CPU when the game explicitly unseals a slot through a staging buffer.
// Falls back to BlindedInt32 memory when WebGPU is unavailable.

import { BlindedInt32 } from "./ProtectedValue.js";

var VAULT_WGSL = `
struct Vault {
    values: array<f32>,
};
@group(0) @binding(0) var<storage, read_write> vault: Vault;
struct Params {
    op: u32,       // 0 add, 1 sub, 2 mul, 3 clamp, 4 min, 5 max, 6 copy
    slot: u32,
    operand: f32,
    low: f32,
    high: f32,
};
@group(0) @binding(1) var<uniform> params: Params;
@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let slot = params.slot;
    if (slot >= u32(arrayLength(&vault.values))) { return; }
    let current = vault.values[slot];
    var next = current;
    switch params.op {
        case 0u: { next = current + params.operand; }
        case 1u: { next = current - params.operand; }
        case 2u: { next = current * params.operand; }
        case 3u: { next = clamp(current, params.low, params.high); }
        case 4u: { next = min(current, params.operand); }
        case 5u: { next = max(current, params.operand); }
        case 6u: { next = params.operand; }
        default: { next = current; }
    }
    vault.values[slot] = next;
}
`;

var OPS = { add: 0, sub: 1, mul: 2, clamp: 3, min: 4, max: 5, set: 6 };

class GPUStateVault {
    constructor(options) {
        options = options || {};
        this.capacity = Math.max(1, options.capacity || 32);
        this.device = options.device || null;
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

    static async create(options) {
        options = options || {};
        if (!options.device && typeof navigator !== "undefined" && navigator.gpu) {
            try {
                var adapter = await navigator.gpu.requestAdapter();
                if (adapter) options.device = await adapter.requestDevice();
            } catch (e) { /* no adapter */ }
        }
        return new GPUStateVault(options);
    }

    _initGPU() {
        try {
            var device = this.device;
            this.buffer = device.createBuffer({
                size: this.capacity * 4,
                usage: 0x80 | 0x8 | 0x10 | 0x4 // STORAGE | COPY_DST | COPY_SRC | UNIFORM-free
                // deliberately no MAP_READ (0x1) and no MAP_WRITE (0x2)
            });
            this.uniform = device.createBuffer({ size: 32, usage: 0x40 | 0x8 }); // UNIFORM | COPY_DST
            this.module = device.createShaderModule({ code: VAULT_WGSL });
            this.pipeline = device.createComputePipeline({ layout: "auto", compute: { module: this.module, entryPoint: "main" } });
            this.bindGroup = device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: this.buffer } },
                    { binding: 1, resource: { buffer: this.uniform } }
                ]
            });
            this.gpu = true;
        } catch (e) {
            this.gpu = false;
            this._initFallback();
        }
    }

    _initFallback() {
        this._fallback = [];
        for (var i = 0; i < this.capacity; i++) this._fallback.push(new BlindedInt32(0));
    }

    // CPU writes are one way (queue.writeBuffer); the value never becomes
    // CPU readable from the vault buffer itself.
    set(slot, value) {
        if (slot < 0 || slot >= this.capacity) throw new Error("GPUStateVault: slot out of range");
        this._apply(OPS.set, slot, value, 0, 0);
        return this;
    }

    add(slot, delta) { this._apply(OPS.add, slot, delta, 0, 0); return this; }
    sub(slot, delta) { this._apply(OPS.sub, slot, delta, 0, 0); return this; }
    mul(slot, factor) { this._apply(OPS.mul, slot, factor, 0, 0); return this; }
    clamp(slot, low, high) { this._apply(OPS.clamp, slot, 0, low, high); return this; }
    min(slot, bound) { this._apply(OPS.min, slot, bound, 0, 0); return this; }
    max(slot, bound) { this._apply(OPS.max, slot, bound, 0, 0); return this; }

    _apply(op, slot, operand, low, high) {
        if (!this.gpu) {
            var blind = this._fallback[slot];
            if (op === OPS.set) blind._set(Math.round(operand));
            else if (op === OPS.add) blind.add(Math.round(operand), true);
            else if (op === OPS.sub) blind.sub(Math.round(operand), true);
            else if (op === OPS.mul) blind._set(Math.round(blind.reveal() * operand));
            else if (op === OPS.clamp) blind._set(Math.min(Math.max(Math.round(low), blind.reveal()), Math.round(high)));
            else if (op === OPS.min) blind._set(Math.min(blind.reveal(), Math.round(operand)));
            else if (op === OPS.max) blind._set(Math.max(blind.reveal(), Math.round(operand)));
            return;
        }
        var params = new ArrayBuffer(32);
        var view = new DataView(params);
        view.setUint32(0, op, true);
        view.setUint32(4, slot, true);
        view.setFloat32(8, operand, true);
        view.setFloat32(12, low, true);
        view.setFloat32(16, high, true);
        var device = this.device;
        device.queue.writeBuffer(this.uniform, 0, params);
        var encoder = device.createCommandEncoder();
        var pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup);
        pass.dispatchWorkgroups(1);
        pass.end();
        device.queue.submit([encoder.finish()]);
        this._sealedWrites++;
    }

    // Explicit, auditable read-back through a throwaway staging buffer.
    async unseal(slot) {
        if (slot < 0 || slot >= this.capacity) throw new Error("GPUStateVault: slot out of range");
        if (!this.gpu) return this._fallback[slot].reveal();
        var device = this.device;
        var staging = device.createBuffer({ size: 4, usage: 0x8 | 0x1 }); // COPY_DST | MAP_READ
        var encoder = device.createCommandEncoder();
        encoder.copyBufferToBuffer(this.buffer, slot * 4, staging, 0, 4);
        device.queue.submit([encoder.finish()]);
        await staging.mapAsync(0x1);
        var value = new DataView(staging.getMappedRange()).getFloat32(0, true);
        staging.unmap();
        staging.destroy();
        return value;
    }

    destroy() {
        if (this.gpu) {
            try { this.buffer.destroy(); } catch (e) { /* gone */ }
            try { this.uniform.destroy(); } catch (e) { /* gone */ }
        }
        this.gpu = false;
    }
}

export { GPUStateVault };
