import { faoxomdecodedds } from "../core/index.js";
import { CompressedCubeTexture, Texture } from "../textures/index.js";
import { FileLoader } from "./FileLoader.js";

class DDSLoader {
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
        var decoded = faoxomdecodedds(buffer);
        var options = { flipY: false, minFilter: decoded.mipmaps > 1 ? "linearMipmapLinear" : "linear", magFilter: "linear", colorSpace: "srgb" };
        var texture = decoded.target === "cubemap" ? new CompressedCubeTexture(decoded, options) : new Texture(null, options);
        if (decoded.target !== "cubemap") { texture.compressed = decoded; texture.loaded = true; }
        texture.needsUpdate = true;
        return texture;
    }
}

export { DDSLoader };
