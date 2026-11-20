import { AssetLoader } from "./AssetLoader.js";

class GLTFLoader {
    constructor(zamga) {
        this.manager = zamga || new AssetLoader;
        this.dracoLoader = null;
        this.ktx2Loader = null;
        this.meshoptDecoder = null;
        this.extensions = {};
    }
    setDRACOLoader(zamga) {
        this.dracoLoader = zamga;
        return this;
    }
    setKTX2Loader(zamga) {
        this.ktx2Loader = zamga;
        return this;
    }
    setMeshoptDecoder(zamga) {
        this.meshoptDecoder = zamga;
        return this;
    }
    register(zamga) {
        if (zamga) {
            var zamgb = zamga(this);
            if (zamgb && zamgb.name) this.extensions[zamgb.name] = zamgb;
        }
        return this;
    }
    load(zamga, zamgb, zamgc, zamgd) {
        var zamge = this;
        return this.manager.loadModel(zamga).then(function(zamga) {
            if (zamgb) zamgb(zamga);
            return zamga;
        }).catch(function(zamga) {
            if (zamgd) zamgd(zamga); else throw zamga;
        });
    }
    parse(zamga, zamgb, zamgc, zamgd) {
        var zamge = this;
        try {
            var zamgf = zamga instanceof ArrayBuffer;
            var zamgg = zamgf ? this.manager.parseGLB(zamga, zamgb || "") : this.manager.parseGLTF(typeof zamga === "string" ? JSON.parse(zamga) : zamga, zamgb || "", []);
            var zamgh = Promise.resolve(zamgg).then(function(zamga) {
                return zamge.manager.prepareCompressedTextures(zamga);
            });
            return zamgh.then(function(zamga) {
                if (zamgc) zamgc(zamga);
                return zamga;
            });
        } catch (zamga) {
            if (zamgd) zamgd(zamga);
            return Promise.reject(zamga);
        }
    }
}

export { GLTFLoader };
