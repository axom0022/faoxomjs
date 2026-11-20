import { FileLoader } from "./FileLoader.js";

import { faoxomdecodemdd } from "./faoxomdecodemdd.js";

class MDDLoader {
    constructor(zamla) {
        this.manager = zamla;
    }
    load(zamla, zamlb, zamlc, zamld) {
        var zamle = this;
        var zamlf = new FileLoader(this.manager);
        zamlf.setResponseType("arraybuffer");
        zamlf.load(zamla, function(zamla) {
            try {
                var zamlc = zamle.parse(zamla);
                if (zamlb) zamlb(zamlc);
            } catch (zamla) {
                if (zamld) zamld(zamla);
            }
        }, zamlc, zamld);
    }
    parse(zamla) {
        return faoxomdecodemdd(zamla);
    }
}

export { MDDLoader };
