import { faoxomdecodehdr } from "../core/index.js";
import { DataTexture } from "../textures/index.js";
import { FileLoader } from "./FileLoader.js";

class RGBELoader {
    constructor(manager) { this.manager = manager; }
    load(url, onLoad, onProgress, onError) {
        var self = this;
        var loader = new FileLoader(this.manager);
        loader.setResponseType("arraybuffer");
        loader.load(url, function(buffer) {
            try { var texture = self.parse(buffer); if (onLoad) onLoad(texture); } catch (e) { if (onError) onError(e); }
        }, onProgress, onError);
    }
    parse(buffer) {
        var decoded = faoxomdecodehdr(buffer);
        var texture = new DataTexture(decoded.data, decoded.width, decoded.height, { type: "float" });
        texture.needsUpdate = true;
        return texture;
    }
}

export { RGBELoader };
