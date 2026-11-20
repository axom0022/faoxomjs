import { Texture } from "./Texture.js";

class Data3DTexture extends Texture {
    constructor(zauwa, zauwb, zauwc, zauwd) {
        super(null);
        this.type = "Data3DTexture";
        this.data = zauwa;
        this.width = zauwb || 16;
        this.height = zauwc || 16;
        this.depth = zauwd || 16;
        this.is3D = true;
    }
}

export { Data3DTexture };
