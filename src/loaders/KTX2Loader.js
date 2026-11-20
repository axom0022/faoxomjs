import { AssetLoader } from "./AssetLoader.js";

class KTX2Loader {
    constructor(zamia, zamib) {
        this.manager = zamia || new AssetLoader;
        this.renderer = zamib || null;
        this.detected = false;
    }
    setTranscoderPath(zamia) {
        return this;
    }
    detectSupport(zamia) {
        this.renderer = zamia || this.renderer;
        this.detected = !!this.renderer;
        return this;
    }
    load(zamia, zamib, zamic, zamid) {
        var zamie = this;
        return this.manager.loadKTX2(zamia, this.renderer).then(function(zamia) {
            if (zamib) zamib(zamia);
            return zamia;
        }).catch(function(zamia) {
            if (zamid) zamid(zamia); else throw zamia;
        });
    }
}

export { KTX2Loader };
