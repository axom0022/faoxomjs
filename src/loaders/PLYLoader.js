import { FileLoader } from "./FileLoader.js";
import { faoxomdecodeply } from "./faoxomdecodeply.js";

class PLYLoader {
    constructor(manager) { this.manager = manager; }
    load(url, onLoad, onProgress, onError) {
        var self = this;
        var loader = new FileLoader(this.manager);
        loader.setResponseType("arraybuffer");
        loader.load(url, function(buffer) {
            try { var geometry = self.parse(buffer); if (onLoad) onLoad(geometry); } catch (e) { if (onError) onError(e); }
        }, onProgress, onError);
    }
    parse(data) { return faoxomdecodeply(data); }
}

export { PLYLoader };
