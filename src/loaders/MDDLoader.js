import { FileLoader } from "./FileLoader.js";
import { faoxomdecodemdd } from "./faoxomdecodemdd.js";

class MDDLoader {
    constructor(manager) { this.manager = manager; }
    load(url, onLoad, onProgress, onError) {
        var self = this;
        var loader = new FileLoader(this.manager);
        loader.setResponseType("arraybuffer");
        loader.load(url, function(buffer) {
            try { var result = self.parse(buffer); if (onLoad) onLoad(result); } catch (e) { if (onError) onError(e); }
        }, onProgress, onError);
    }
    parse(data) { return faoxomdecodemdd(data); }
}

export { MDDLoader };
