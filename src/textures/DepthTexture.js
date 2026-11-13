import { FloatType } from "../core/index.js";
import { Texture } from "./Texture.js";

class DepthTexture extends Texture {
    constructor(width, height, options) { options = options || {}; super(null, options); this.width = Math.max(1, Math.floor(width || 1)); this.height = Math.max(1, Math.floor(height || 1)); this.format = options.format || "depth"; this.type = options.type || FloatType; this.isDepthTexture = true; this.loaded = true; this.needsUpdate = true; }
}

export { DepthTexture };
