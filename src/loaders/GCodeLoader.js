import { FileLoader } from "./FileLoader.js";
import { faoxomdecodegcode } from "./faoxomdecodegcode.js";

class GCodeLoader {
    constructor(manager) { this.manager = manager; this.splitLayer = false; }
    load(url, onLoad, onProgress, onError) {
        var self = this;
        var loader = new FileLoader(this.manager);
        loader.load(url, function(text) {
            try { var object = self.parse(text); if (onLoad) onLoad(object); } catch (e) { if (onError) onError(e); }
        }, onProgress, onError);
    }
    parse(data) { return faoxomdecodegcode.call(this, data); }
}

export { GCodeLoader };
