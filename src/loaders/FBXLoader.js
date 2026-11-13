import { AssetLoader } from "./AssetLoader.js";

class FBXLoader {
    constructor(manager) { this.manager = manager || new AssetLoader(); }
    load(url, onLoad, onProgress, onError) { var self = this; return this.manager.loadModel(url).then(function(result) { if (onLoad) onLoad(result); return result; }).catch(function(error) { if (onError) onError(error); else throw error; }); }
    parse(data, path, onLoad, onError) { var self = this; return this.manager.parseFBX(data, path || "").then(function(result) { if (onLoad) onLoad(result); return result; }).catch(function(error) { if (onError) onError(error); else throw error; }); }
}

export { FBXLoader };
