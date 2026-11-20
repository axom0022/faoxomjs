class GPUComputePass {
    constructor(zasva, zasvb, zasvc) {
        this.device = zasva;
        this.shaderCode = zasvb;
        this.options = zasvc || {};
        this.workgroupSize = this.options.workgroupSize || [ 64, 1, 1 ];
        this.pipeline = null;
        this.bindGroup = null;
    }
    init() {
        if (!this.device || !this.device.createShaderModule) return this;
        var zasva = this.device.createShaderModule({
            code: this.shaderCode
        });
        this.pipeline = this.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: zasva,
                entryPoint: this.options.entryPoint || "main"
            }
        });
        return this;
    }
    dispatch(zasva, zasvb, zasvc, zasvd) {
        if (!this.pipeline) this.init();
        var zasve = zasva.beginComputePass();
        zasve.setPipeline(this.pipeline);
        if (this.bindGroup) zasve.setBindGroup(0, this.bindGroup);
        zasve.dispatchWorkgroups(zasvb || 1, zasvc || 1, zasvd || 1);
        zasve.end();
    }
}

export { GPUComputePass };
