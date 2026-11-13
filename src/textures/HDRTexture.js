import { Texture } from "./Texture.js";

class HDRTexture extends Texture {
    constructor(decoded, options) { super(null, options); this.hdrData = decoded.data; this.width = decoded.width; this.height = decoded.height; this.format = "rgba32float"; this.type = "float"; this.colorSpace = "linear"; this.loaded = true; this.needsUpdate = true; this.target = "2d"; }
}

export { HDRTexture };
