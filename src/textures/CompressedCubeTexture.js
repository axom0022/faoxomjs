import { CubeTexture } from "./CubeTexture.js";

class CompressedCubeTexture extends CubeTexture {
    constructor(zausa, zausb) {
        super([], zausb);
        this.compressed = zausa;
        this.loaded = true;
        this.needsUpdate = true;
        this.target = "cubemap";
    }
}

export { CompressedCubeTexture };
