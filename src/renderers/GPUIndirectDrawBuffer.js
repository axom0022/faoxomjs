import { faoxomgpureadbuffer } from "../core/index.js";

class GPUIndirectDrawBuffer {
    constructor(zasya, zasyb) {
        this.device = zasya;
        this.count = zasyb || 1;
        this.buffer = null;
        this.byteLength = this.count * 20;
        this._argsData = new Uint32Array(5);
    }
    init() {
        if (this.device && this.device.createBuffer) {
            this.buffer = this.device.createBuffer({
                size: this.byteLength,
                usage: GPUBufferUsage ? GPUBufferUsage.INDIRECT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC : 256
            });
        }
        return this;
    }
    writeArgs(zasya, zasyb, zasyc, zasyd, zasye) {
        if (!this.buffer) this.init();
        this._argsData[0] = zasya | 0;
        this._argsData[1] = zasyb | 0;
        this._argsData[2] = zasyc | 0;
        this._argsData[3] = zasyd | 0;
        this._argsData[4] = zasye | 0;
        this.device.queue.writeBuffer(this.buffer, 0, this._argsData);
        return this;
    }
    readArgs() {
        if (!this.buffer) this.init();
        return faoxomgpureadbuffer(this.device, this.buffer, 20).then(function(zasya) {
            return new Uint32Array(zasya);
        });
    }
}

export { GPUIndirectDrawBuffer };
