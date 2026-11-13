import { faoxomvalue } from "../math/index.js";
import { Texture } from "./Texture.js";

class DataArrayTexture extends Texture {
    constructor(data, width, height, depth, options) { options = options || {}; super(null, options); this.isArrayTexture = true; this.data = data || null; this.width = Math.max(1, Math.floor(width || 1)); this.height = Math.max(1, Math.floor(height || 1)); this.depth = Math.max(1, Math.floor(depth || 1)); this.format = faoxomvalue(options.format, "rgba"); this.type = faoxomvalue(options.type, "unsignedByte"); this.colorSpace = faoxomvalue(options.colorSpace, "linear"); this.flipY = false; this.minFilter = faoxomvalue(options.minFilter, "nearest"); this.magFilter = faoxomvalue(options.magFilter, "nearest"); this.generateMipmaps = false; this.loaded = true; this.needsUpdate = true; }
    setData(data) { this.data = data || this.data; this.needsUpdate = true; return this; }
}

export { DataArrayTexture };
