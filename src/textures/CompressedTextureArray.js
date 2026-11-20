import { Texture } from "./Texture.js";

class CompressedTextureArray extends Texture {
    constructor(zauua, zauub) {
        super(null, zauub);
        this.compressed = zauua;
        this.loaded = true;
        this.needsUpdate = true;
        this.target = "array";
        this.layers = zauua.layers;
    }
}

export { CompressedTextureArray };
