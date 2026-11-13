import { faoxomgpureadbuffer } from "../core/index.js";

class GPUIndirectDrawBuffer {
    constructor(device, count) {
        this.device = device;
        this.count = count || 1;
        this.buffer = null;
        this.byteLength = this.count * 20;
        this._argsData = new Uint32Array(5);
    }
    init() {
        if (this.device && this.device.createBuffer) {
            this.buffer = this.device.createBuffer({
                size: this.byteLength,
                usage: GPUBufferUsage ? (GPUBufferUsage.INDIRECT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC) : 0x0100
            });
        }
        return this;
    }
    writeArgs(indexCount, instanceCount, firstIndex, baseVertex, firstInstance) {
        if (!this.buffer) this.init();
        this._argsData[0] = indexCount | 0;
        this._argsData[1] = instanceCount | 0;
        this._argsData[2] = firstIndex | 0;
        this._argsData[3] = baseVertex | 0;
        this._argsData[4] = firstInstance | 0;
        this.device.queue.writeBuffer(this.buffer, 0, this._argsData);
        return this;
    }
    readArgs() {
        if (!this.buffer) this.init();
        return faoxomgpureadbuffer(this.device, this.buffer, 20).then(function(copy) { return new Uint32Array(copy); });
    }
}

export { GPUIndirectDrawBuffer };
