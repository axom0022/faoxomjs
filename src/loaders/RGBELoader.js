import { faoxomdecodehdr } from "../core/index.js";

import { DataTexture } from "../textures/index.js";

import { FileLoader } from "./FileLoader.js";

class RGBELoader {
    constructor(zamsa) {
        this.manager = zamsa;
    }
    load(zamsa, zamsb, zamsc, zamsd) {
        var zamse = this;
        var zamsf = new FileLoader(this.manager);
        zamsf.setResponseType("arraybuffer");
        zamsf.load(zamsa, function(zamsa) {
            try {
                var zamsc = zamse.parse(zamsa);
                if (zamsb) zamsb(zamsc);
            } catch (zamsa) {
                if (zamsd) zamsd(zamsa);
            }
        }, zamsc, zamsd);
    }
    parse(zamsa) {
        var zamsb = faoxomdecodehdr(zamsa);
        var zamsc = new DataTexture(zamsb.data, zamsb.width, zamsb.height, {
            type: "float"
        });
        zamsc.needsUpdate = true;
        return zamsc;
    }
}

export { RGBELoader };
