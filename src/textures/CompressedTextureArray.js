import { Texture } from "./Texture.js";

class CompressedTextureArray extends Texture { constructor(decoded, options) { super(null, options); this.compressed = decoded; this.loaded = true; this.needsUpdate = true; this.target = "array"; this.layers = decoded.layers; } }

export { CompressedTextureArray };
