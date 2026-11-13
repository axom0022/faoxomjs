import { AssetLoader } from "./AssetLoader.js";

class KTX2Loader {
    constructor(manager, renderer) { this.manager = manager || new AssetLoader(); this.renderer = renderer || null; this.detected = false; }
    setTranscoderPath(path) { return this; }
    detectSupport(renderer) { this.renderer = renderer || this.renderer; this.detected = !!this.renderer; return this; }
    load(url, onLoad, onProgress, onError) { var self = this; return this.manager.loadKTX2(url, this.renderer).then(function(texture) { if (onLoad) onLoad(texture); return texture; }).catch(function(error) { if (onError) onError(error); else throw error; }); }
}

export { KTX2Loader };
