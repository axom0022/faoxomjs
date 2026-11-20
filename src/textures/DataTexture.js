import { faoxomvalue } from "../math/index.js";

import { Texture } from "./Texture.js";

class DataTexture extends Texture {
    constructor(zauya, zauyb, zauyc, zauyd) {
        zauyd = zauyd || {};
        super(null, zauyd);
        this.isDataTexture = true;
        this.data = zauya || null;
        this.width = Math.max(1, Math.floor(zauyb || 1));
        this.height = Math.max(1, Math.floor(zauyc || 1));
        this.format = faoxomvalue(zauyd.format, "rgba");
        this.type = faoxomvalue(zauyd.type, "unsignedByte");
        this.colorSpace = faoxomvalue(zauyd.colorSpace, "linear");
        this.flipY = zauyd.flipY === true;
        this.minFilter = faoxomvalue(zauyd.minFilter, "nearest");
        this.magFilter = faoxomvalue(zauyd.magFilter, "nearest");
        this.generateMipmaps = zauyd.generateMipmaps === true;
        this.loaded = true;
        this.needsUpdate = true;
    }
    setData(zauya) {
        this.data = zauya || this.data;
        this.needsUpdate = true;
        return this;
    }
    setSize(zauya, zauyb) {
        this.width = Math.max(1, Math.floor(zauya || 1));
        this.height = Math.max(1, Math.floor(zauyb || 1));
        this.needsUpdate = true;
        return this;
    }
}

export { DataTexture };
