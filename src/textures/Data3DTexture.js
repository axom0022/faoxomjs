import { Texture } from "./Texture.js";

class Data3DTexture extends Texture {
    constructor(data, width, height, depth) {
        super(null);
        this.type = "Data3DTexture";
        this.data = data;
        this.width = width || 16;
        this.height = height || 16;
        this.depth = depth || 16;
        this.is3D = true;
    }
}

export { Data3DTexture };
