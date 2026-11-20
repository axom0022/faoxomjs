import { Texture } from "./Texture.js";

class HDRTexture extends Texture {
    constructor(zavaa, zavab) {
        super(null, zavab);
        this.hdrData = zavaa.data;
        this.width = zavaa.width;
        this.height = zavaa.height;
        this.format = "rgba32float";
        this.type = "float";
        this.colorSpace = "linear";
        this.loaded = true;
        this.needsUpdate = true;
        this.target = "2d";
    }
}

export { HDRTexture };
