import { Texture } from "../textures/index.js";
import { FileLoader } from "./FileLoader.js";
import { LoadingManager } from "./LoadingManager.js";

class TextureLoader {
    constructor(manager) { this.manager = manager || new LoadingManager(); this.path = ""; }
    setPath(path) { this.path = path || ""; return this; }
    load(url, onLoad, onProgress, onError) { var texture = new Texture(); new FileLoader(this.manager).setPath(this.path).setResponseType("arraybuffer").load(url, function(data) { if (typeof Blob !== "undefined") { var blob = new Blob([data]); if (typeof createImageBitmap === "function") createImageBitmap(blob).then(function(image) { texture.image = image; texture.loaded = true; texture.needsUpdate = true; if (onLoad) onLoad(texture); }).catch(onError || function() {}); else if (typeof Image !== "undefined") { var image = new Image(); image.onload = function() { texture.image = image; texture.loaded = true; texture.needsUpdate = true; if (onLoad) onLoad(texture); }; image.onerror = onError || function() {}; image.src = URL.createObjectURL(blob); } } return texture; }, onProgress, onError); return texture; }
}

export { TextureLoader };
