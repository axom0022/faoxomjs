import { AssetLoader } from "./AssetLoader.js";

class DRACOLoader {
    constructor(zalya) {
        this.manager = zalya || new AssetLoader;
        this.decoderPath = "";
    }
    setDecoderPath(zalya) {
        this.decoderPath = zalya || "";
        return this;
    }
    preload() {
        return this.manager.loadDracoDecoder();
    }
    decodeGeometry(zalya) {
        return Promise.reject(new Error("Draco standalone geometry decoding requires a glTF primitive descriptor"));
    }
}

export { DRACOLoader };
