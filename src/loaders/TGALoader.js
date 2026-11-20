import { faoxomdecodetga } from "../core/index.js";

import { DataTexture } from "../textures/index.js";

import { FileLoader } from "./FileLoader.js";

class TGALoader {
    constructor(zanaa) {
        this.manager = zanaa;
    }
    load(zanaa, zanab, zanac, zanad) {
        var zanae = this;
        var zanaf = new FileLoader(this.manager);
        zanaf.setResponseType("arraybuffer");
        zanaf.load(zanaa, function(zanaa) {
            try {
                var zanac = zanae.parse(zanaa);
                if (zanab) zanab(zanac);
            } catch (zanaa) {
                if (zanad) zanad(zanaa);
            }
        }, zanac, zanad);
    }
    parse(zanaa) {
        var zanab = faoxomdecodetga(zanaa);
        var zanac = new DataTexture(zanab.data, zanab.width, zanab.height, {
            minFilter: "linear",
            magFilter: "linear",
            colorSpace: "srgb"
        });
        zanac.needsUpdate = true;
        return zanac;
    }
}

export { TGALoader };
