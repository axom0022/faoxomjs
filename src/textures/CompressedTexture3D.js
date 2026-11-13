import { Texture } from "./Texture.js";

class CompressedTexture3D extends Texture { constructor(decoded, options) { super(null, options); this.compressed = decoded; this.loaded = true; this.needsUpdate = true; this.target = "3d"; this.depth = decoded.depth; } }

export { CompressedTexture3D };
