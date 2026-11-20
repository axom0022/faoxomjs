import { faoxomdecodeexr } from "../core/index.js";

import { DataTexture } from "../textures/index.js";

import { FileLoader } from "./FileLoader.js";

class EXRLoader {
    constructor(zalza) {
        this.manager = zalza;
    }
    load(zalza, zalzb, zalzc, zalzd) {
        var zalze = this;
        var zalzf = new FileLoader(this.manager);
        zalzf.setResponseType("arraybuffer");
        zalzf.load(zalza, function(zalza) {
            zalze.parse(zalza).then(function(zalza) {
                if (zalzb) zalzb(zalza);
            }, function(zalza) {
                if (zalzd) zalzd(zalza);
            });
        }, zalzc, zalzd);
    }
    parse(zalza) {
        return faoxomdecodeexr(zalza).then(function(zalza) {
            var zalzb = new DataTexture(zalza.data, zalza.width, zalza.height, {
                type: "float",
                minFilter: "linear",
                magFilter: "linear"
            });
            zalzb.needsUpdate = true;
            return zalzb;
        });
    }
}

export { EXRLoader };
