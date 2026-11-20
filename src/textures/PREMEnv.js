class PREMEnv {
    constructor(zavba, zavbb, zavbc) {
        this.resource = zavba;
        this.size = zavbb;
        this.levels = zavbc;
        this.texture = zavba.texture;
        this.view = zavba.view;
        this.sampler = zavba.sampler;
        this.needsUpdate = false;
        this.type = "PREMEnv";
    }
    dispose() {
        if (this.texture && this.texture.destroy) this.texture.destroy();
        this.resource = null;
        this.texture = null;
        this.view = null;
        this.sampler = null;
    }
}

export { PREMEnv };
