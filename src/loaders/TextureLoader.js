import { Texture } from "../textures/index.js";

import { FileLoader } from "./FileLoader.js";

import { LoadingManager } from "./LoadingManager.js";

class TextureLoader {
    constructor(zanba) {
        this.manager = zanba || new LoadingManager;
        this.path = "";
    }
    setPath(zanba) {
        this.path = zanba || "";
        return this;
    }
    load(zanba, zanbb, zanbc, zanbd) {
        var zanbe = new Texture;
        new FileLoader(this.manager).setPath(this.path).setResponseType("arraybuffer").load(zanba, function(zanba) {
            if (typeof Blob !== "undefined") {
                var zanbc = new Blob([ zanba ]);
                if (typeof createImageBitmap === "function") createImageBitmap(zanbc).then(function(zanba) {
                    zanbe.image = zanba;
                    zanbe.loaded = true;
                    zanbe.needsUpdate = true;
                    if (zanbb) zanbb(zanbe);
                }).catch(zanbd || function() {}); else if (typeof Image !== "undefined") {
                    var zanbf = new Image;
                    zanbf.onload = function() {
                        zanbe.image = zanbf;
                        zanbe.loaded = true;
                        zanbe.needsUpdate = true;
                        if (zanbb) zanbb(zanbe);
                    };
                    zanbf.onerror = zanbd || function() {};
                    zanbf.src = URL.createObjectURL(zanbc);
                }
            }
            return zanbe;
        }, zanbc, zanbd);
        return zanbe;
    }
}

export { TextureLoader };
