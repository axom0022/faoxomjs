class ReflectionProbeEnvironment {
    constructor(resource, resolution) { this.resource = resource; this.texture = resource.texture; this.view = resource.view; this.sampler = resource.sampler; this.resolution = resolution; this.type = "ReflectionProbeEnvironment"; this.needsUpdate = false; }
    dispose() { if (this.texture && this.texture.destroy) this.texture.destroy(); this.resource = null; this.texture = null; this.view = null; this.sampler = null; }
}

export { ReflectionProbeEnvironment };
