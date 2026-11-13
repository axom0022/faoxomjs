import { faoxomdecodehdr } from "../core/index.js";
import { CubeTexture } from "../textures/index.js";
import { FileLoader } from "./FileLoader.js";

class HDRCubeTextureLoader {
    constructor(manager) { this.manager = manager; }
    load(urls, onLoad, onProgress, onError) {
        var manager = this.manager;
        var texture = new CubeTexture([], { flipY: false, colorSpace: "linear", minFilter: "linear", magFilter: "linear", generateMipmaps: false });
        var remaining = 6, failed = false;
        var finish = function() { if (failed) return; texture.loaded = true; texture.needsUpdate = true; if (onLoad) onLoad(texture); };
        for (var i = 0; i < 6; i++) {
            (function(index) {
                new FileLoader(manager).setResponseType("arraybuffer").load(urls[index], function(buffer) {
                    if (failed) return;
                    try {
                        var decoded = faoxomdecodehdr(buffer);
                        texture.images[index] = { data: decoded.data, width: decoded.width, height: decoded.height };
                    } catch (e) { failed = true; if (onError) onError(e); return; }
                    if (--remaining === 0) finish();
                }, onProgress, function(error) { failed = true; if (onError) onError(error); });
            })(i);
        }
        return texture;
    }
}

export { HDRCubeTextureLoader };
