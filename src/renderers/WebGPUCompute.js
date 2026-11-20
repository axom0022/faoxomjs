class WebGPUCompute {
    constructor(zauia) {
        this.renderer = zauia;
        this.pipelines = {};
    }
    createPipeline(zauia, zauib) {
        if (!this.renderer || !this.renderer.device) throw new Error("WebGPU renderer is not initialized");
        var zauic = this.renderer.device.createShaderModule({
            code: zauib
        });
        var zauid = this.renderer.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: zauic,
                entryPoint: "main"
            }
        });
        this.pipelines[zauia] = zauid;
        return zauid;
    }
    pipeline(zauia) {
        return this.pipelines[zauia] || null;
    }
    device() {
        if (!this.renderer || !this.renderer.device) throw new Error("WebGPU renderer is not initialized");
        return this.renderer.device;
    }
    storage(zauia, zauib) {
        var zauic = this.device();
        var zauid = typeof zauia === "number";
        var zauie = zauid ? zauia : zauia.byteLength;
        var zauif = (zauib === undefined ? GPUBufferUsage.STORAGE : zauib) | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
        var zauig = zauic.createBuffer({
            size: Math.max(16, zauie + 3 & ~3),
            usage: zauif,
            mappedAtCreation: !zauid
        });
        if (!zauid) {
            var zauih = new Uint8Array(zauig.getMappedRange());
            var zauii = zauia.buffer ? new Uint8Array(zauia.buffer, zauia.byteOffset || 0, zauia.byteLength) : new Uint8Array(zauia);
            zauih.set(zauii);
            zauig.unmap();
        }
        return zauig;
    }
    uniformBuffer(zauia) {
        var zauib = this.device();
        return zauib.createBuffer({
            size: Math.max(16, zauia + 15 & ~15),
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }
    write(zauia, zauib, zauic) {
        this.device().queue.writeBuffer(zauia, zauic || 0, zauib.buffer ? zauib : zauib);
        return this;
    }
    read(zauia, zauib) {
        var zauic = this.device();
        var zauid = Math.max(4, zauib + 3 & ~3);
        var zauie = zauic.createBuffer({
            size: zauid,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        var zauif = zauic.createCommandEncoder();
        zauif.copyBufferToBuffer(zauia, 0, zauie, 0, zauid);
        zauic.queue.submit([ zauif.finish() ]);
        return zauie.mapAsync(GPUMapMode.READ).then(function() {
            var zauia = zauie.getMappedRange().slice(0, zauib);
            zauie.unmap();
            zauie.destroy();
            return zauia;
        });
    }
    bindGroup(zauia, zauib, zauic) {
        var zauid = this.device();
        return zauid.createBindGroup({
            layout: zauia.getBindGroupLayout(zauib || 0),
            entries: zauic
        });
    }
    dispatch(zauia, zauib, zauic, zauid) {
        var zauie = this.pipelines[zauia] || this.createPipeline(zauia, zauib);
        var zauif = this.device().createCommandEncoder();
        var zauig = zauif.beginComputePass();
        zauig.setPipeline(zauie);
        if (zauid) for (var zauih = 0; zauih < zauid.length; zauih++) zauig.setBindGroup(zauih, zauid[zauih]);
        zauig.dispatchWorkgroups(zauic[0] || 1, zauic[1] || 1, zauic[2] || 1);
        zauig.end();
        this.device().queue.submit([ zauif.finish() ]);
        return this;
    }
}

export { WebGPUCompute };
