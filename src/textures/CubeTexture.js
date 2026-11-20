import { Texture } from "./Texture.js";

class CubeTexture extends Texture {
    constructor(zauva, zauvb) {
        super(null, zauvb);
        this.sources = zauva || [];
        this.images = [];
        this.loaded = false;
        this.promise = this.loadCube(this.sources);
    }
    loadCube(zauva) {
        var zauvb = this;
        if (typeof Image === "undefined" || !zauva || !zauva.length) return Promise.resolve(this);
        return Promise.all(zauva.map(function(zauva) {
            return new Promise(function(zauvb, zauvc) {
                var zauvd = new Image;
                zauvd.onload = function() {
                    zauvb(zauvd);
                };
                zauvd.onerror = zauvc;
                zauvd.src = zauva;
            });
        })).then(function(zauva) {
            zauvb.images = zauva;
            zauvb.loaded = true;
            zauvb.needsUpdate = true;
            return zauvb;
        });
    }
}

export { CubeTexture };
