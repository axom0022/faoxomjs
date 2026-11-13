import { AssetLoader } from "./AssetLoader.js";

class GLTFLoader {
    constructor(manager) { this.manager = manager || new AssetLoader(); this.dracoLoader = null; this.ktx2Loader = null; this.meshoptDecoder = null; this.extensions = {}; }
    setDRACOLoader(loader) { this.dracoLoader = loader; return this; }
    setKTX2Loader(loader) { this.ktx2Loader = loader; return this; }
    setMeshoptDecoder(decoder) { this.meshoptDecoder = decoder; return this; }
    register(callback) { if (callback) { var extension = callback(this); if (extension && extension.name) this.extensions[extension.name] = extension; } return this; }
    load(url, onLoad, onProgress, onError) { var self = this; return this.manager.loadModel(url).then(function(result) { if (onLoad) onLoad(result); return result; }).catch(function(error) { if (onError) onError(error); else throw error; }); }
    parse(data, path, onLoad, onError) { var self = this; try { var isBinary = data instanceof ArrayBuffer; var result = isBinary ? this.manager.parseGLB(data, path || "") : this.manager.parseGLTF(typeof data === "string" ? JSON.parse(data) : data, path || "", []); var promise = Promise.resolve(result).then(function(value) { return self.manager.prepareCompressedTextures(value); }); return promise.then(function(value) { if (onLoad) onLoad(value); return value; }); } catch (error) { if (onError) onError(error); return Promise.reject(error); } }
}

export { GLTFLoader };
