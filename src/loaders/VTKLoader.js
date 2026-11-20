import { FileLoader } from "./FileLoader.js";

import { faoxomdecodevtk } from "./faoxomdecodevtk.js";

class VTKLoader {
    constructor(zanca) {
        this.manager = zanca;
    }
    load(zanca, zancb, zancc, zancd) {
        var zance = this;
        var zancf = new FileLoader(this.manager);
        zancf.setResponseType("arraybuffer");
        zancf.load(zanca, function(zanca) {
            try {
                var zancc = zance.parse(zanca);
                if (zancb) zancb(zancc);
            } catch (zanca) {
                if (zancd) zancd(zanca);
            }
        }, zancc, zancd);
    }
    parse(zanca) {
        return faoxomdecodevtk(zanca);
    }
}

export { VTKLoader };
