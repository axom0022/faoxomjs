class ReflectionProbeEnvironment {
    constructor(zaiqa, zaiqb) {
        this.resource = zaiqa;
        this.texture = zaiqa.texture;
        this.view = zaiqa.view;
        this.sampler = zaiqa.sampler;
        this.resolution = zaiqb;
        this.type = "ReflectionProbeEnvironment";
        this.needsUpdate = false;
    }
    dispose() {
        if (this.texture && this.texture.destroy) this.texture.destroy();
        this.resource = null;
        this.texture = null;
        this.view = null;
        this.sampler = null;
    }
}

export { ReflectionProbeEnvironment };
