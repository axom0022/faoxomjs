import { Texture } from "./Texture.js";

class CubeTexture extends Texture { constructor(sources, options) { super(null, options); this.sources = sources || []; this.images = []; this.loaded = false; this.promise = this.loadCube(this.sources); } loadCube(sources) { var self = this; if (typeof Image === "undefined" || !sources || !sources.length) return Promise.resolve(this); return Promise.all(sources.map(function(url) { return new Promise(function(resolve, reject) { var image = new Image(); image.onload = function() { resolve(image); }; image.onerror = reject; image.src = url; }); })).then(function(images) { self.images = images; self.loaded = true; self.needsUpdate = true; return self; }); } }

export { CubeTexture };
