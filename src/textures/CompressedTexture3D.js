import { Texture } from "./Texture.js";

class CompressedTexture3D extends Texture {
    constructor(zauta, zautb) {
        super(null, zautb);
        this.compressed = zauta;
        this.loaded = true;
        this.needsUpdate = true;
        this.target = "3d";
        this.depth = zauta.depth;
    }
}

export { CompressedTexture3D };
