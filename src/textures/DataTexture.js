import { faoxomvalue } from "../math/index.js";
import { Texture } from "./Texture.js";

class DataTexture extends Texture {
    constructor(data, width, height, options) { options = options || {}; super(null, options); this.isDataTexture = true; this.data = data || null; this.width = Math.max(1, Math.floor(width || 1)); this.height = Math.max(1, Math.floor(height || 1)); this.format = faoxomvalue(options.format, "rgba"); this.type = faoxomvalue(options.type, "unsignedByte"); this.colorSpace = faoxomvalue(options.colorSpace, "linear"); this.flipY = options.flipY === true; this.minFilter = faoxomvalue(options.minFilter, "nearest"); this.magFilter = faoxomvalue(options.magFilter, "nearest"); this.generateMipmaps = options.generateMipmaps === true; this.loaded = true; this.needsUpdate = true; }
    setData(data) { this.data = data || this.data; this.needsUpdate = true; return this; }
    setSize(width, height) { this.width = Math.max(1, Math.floor(width || 1)); this.height = Math.max(1, Math.floor(height || 1)); this.needsUpdate = true; return this; }
}

export { DataTexture };
