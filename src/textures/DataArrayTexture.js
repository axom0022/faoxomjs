import { faoxomvalue } from "../math/index.js";

import { Texture } from "./Texture.js";

class DataArrayTexture extends Texture {
    constructor(zauxa, zauxb, zauxc, zauxd, zauxe) {
        zauxe = zauxe || {};
        super(null, zauxe);
        this.isArrayTexture = true;
        this.data = zauxa || null;
        this.width = Math.max(1, Math.floor(zauxb || 1));
        this.height = Math.max(1, Math.floor(zauxc || 1));
        this.depth = Math.max(1, Math.floor(zauxd || 1));
        this.format = faoxomvalue(zauxe.format, "rgba");
        this.type = faoxomvalue(zauxe.type, "unsignedByte");
        this.colorSpace = faoxomvalue(zauxe.colorSpace, "linear");
        this.flipY = false;
        this.minFilter = faoxomvalue(zauxe.minFilter, "nearest");
        this.magFilter = faoxomvalue(zauxe.magFilter, "nearest");
        this.generateMipmaps = false;
        this.loaded = true;
        this.needsUpdate = true;
    }
    setData(zauxa) {
        this.data = zauxa || this.data;
        this.needsUpdate = true;
        return this;
    }
}

export { DataArrayTexture };
