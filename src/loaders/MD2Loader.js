import { FileLoader } from "./FileLoader.js";
import { faoxomdecodemd2 } from "./faoxomdecodemd2.js";

class MD2Loader {
    constructor(manager) { this.manager = manager; }
    load(url, onLoad, onProgress, onError) {
        var self = this;
        var loader = new FileLoader(this.manager);
        loader.setResponseType("arraybuffer");
        loader.load(url, function(buffer) {
            try { var geometry = self.parse(buffer); if (onLoad) onLoad(geometry); } catch (e) { if (onError) onError(e); }
        }, onProgress, onError);
    }
    parse(data) { return faoxomdecodemd2(data); }
}

export { MD2Loader };
