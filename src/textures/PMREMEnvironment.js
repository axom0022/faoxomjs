class PMREMEnvironment {
    constructor(resource, size, levels) { this.resource = resource; this.size = size; this.levels = levels; this.texture = resource.texture; this.view = resource.view; this.sampler = resource.sampler; this.needsUpdate = false; this.type = "PMREMEnvironment"; }
    dispose() { if (this.texture && this.texture.destroy) this.texture.destroy(); this.resource = null; this.texture = null; this.view = null; this.sampler = null; }
}

export { PMREMEnvironment };
