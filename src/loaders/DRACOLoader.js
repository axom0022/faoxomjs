import { AssetLoader } from "./AssetLoader.js";

class DRACOLoader {
    constructor(manager) { this.manager = manager || new AssetLoader(); this.decoderPath = ""; }
    setDecoderPath(path) { this.decoderPath = path || ""; return this; }
    preload() { return this.manager.loadDracoDecoder(); }
    decodeGeometry(data) { return Promise.reject(new Error("Draco standalone geometry decoding requires a glTF primitive descriptor")); }
}

export { DRACOLoader };
