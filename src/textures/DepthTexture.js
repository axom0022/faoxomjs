import { FloatType } from "../core/index.js";

import { Texture } from "./Texture.js";

class DepthTexture extends Texture {
    constructor(zauza, zauzb, zauzc) {
        zauzc = zauzc || {};
        super(null, zauzc);
        this.width = Math.max(1, Math.floor(zauza || 1));
        this.height = Math.max(1, Math.floor(zauzb || 1));
        this.format = zauzc.format || "depth";
        this.type = zauzc.type || FloatType;
        this.isDepthTexture = true;
        this.loaded = true;
        this.needsUpdate = true;
    }
}

export { DepthTexture };
