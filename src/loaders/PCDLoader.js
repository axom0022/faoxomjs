import { FileLoader } from "./FileLoader.js";
import { faoxomdecodepcd } from "./faoxomdecodepcd.js";

class PCDLoader {
    constructor(manager) { this.manager = manager; }
    load(url, onLoad, onProgress, onError) {
        var self = this;
        var loader = new FileLoader(this.manager);
        loader.setResponseType("arraybuffer");
        loader.load(url, function(buffer) {
            try { var points = self.parse(buffer); if (onLoad) onLoad(points); } catch (e) { if (onError) onError(e); }
        }, onProgress, onError);
    }
    parse(data) { return faoxomdecodepcd(data); }
}

export { PCDLoader };
