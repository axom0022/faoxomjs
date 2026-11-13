import { CubeTexture } from "./CubeTexture.js";

class CompressedCubeTexture extends CubeTexture { constructor(decoded, options) { super([], options); this.compressed = decoded; this.loaded = true; this.needsUpdate = true; this.target = "cubemap"; } }

export { CompressedCubeTexture };
