import { faoxomdecodeexr } from "../core/index.js";
import { DataTexture } from "../textures/index.js";
import { FileLoader } from "./FileLoader.js";

class EXRLoader {
    constructor(manager) { this.manager = manager; }
    load(url, onLoad, onProgress, onError) {
        var self = this;
        var loader = new FileLoader(this.manager);
        loader.setResponseType("arraybuffer");
        loader.load(url, function(buffer) {
            self.parse(buffer).then(function(texture) { if (onLoad) onLoad(texture); }, function(error) { if (onError) onError(error); });
        }, onProgress, onError);
    }
    parse(buffer) {
        return faoxomdecodeexr(buffer).then(function(decoded) {
            var texture = new DataTexture(decoded.data, decoded.width, decoded.height, { type: "float", minFilter: "linear", magFilter: "linear" });
            texture.needsUpdate = true;
            return texture;
        });
    }
}

export { EXRLoader };
