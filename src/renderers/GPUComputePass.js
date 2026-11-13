class GPUComputePass {
    constructor(device, shaderCode, options) {
        this.device = device;
        this.shaderCode = shaderCode;
        this.options = options || {};
        this.workgroupSize = this.options.workgroupSize || [64, 1, 1];
        this.pipeline = null;
        this.bindGroup = null;
    }
    init() {
        if (!this.device || !this.device.createShaderModule) return this;
        var module = this.device.createShaderModule({ code: this.shaderCode });
        this.pipeline = this.device.createComputePipeline({
            layout: "auto",
            compute: { module: module, entryPoint: this.options.entryPoint || "main" }
        });
        return this;
    }
    dispatch(commandEncoder, x, y, z) {
        if (!this.pipeline) this.init();
        var pass = commandEncoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        if (this.bindGroup) pass.setBindGroup(0, this.bindGroup);
        pass.dispatchWorkgroups(x || 1, y || 1, z || 1);
        pass.end();
    }
}

export { GPUComputePass };
