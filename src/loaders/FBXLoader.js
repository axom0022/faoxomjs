import { AssetLoader } from "./AssetLoader.js";

class FBXLoader {
    constructor(zamaa) {
        this.manager = zamaa || new AssetLoader;
    }
    load(zamaa, zamab, zamac, zamad) {
        var zamae = this;
        return this.manager.loadModel(zamaa).then(function(zamaa) {
            if (zamab) zamab(zamaa);
            return zamaa;
        }).catch(function(zamaa) {
            if (zamad) zamad(zamaa); else throw zamaa;
        });
    }
    parse(zamaa, zamab, zamac, zamad) {
        var zamae = this;
        return this.manager.parseFBX(zamaa, zamab || "").then(function(zamaa) {
            if (zamac) zamac(zamaa);
            return zamaa;
        }).catch(function(zamaa) {
            if (zamad) zamad(zamaa); else throw zamaa;
        });
    }
}

export { FBXLoader };
