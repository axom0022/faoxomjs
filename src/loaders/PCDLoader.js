import { FileLoader } from "./FileLoader.js";

import { faoxomdecodepcd } from "./faoxomdecodepcd.js";

class PCDLoader {
    constructor(zampa) {
        this.manager = zampa;
    }
    load(zampa, zampb, zampc, zampd) {
        var zampe = this;
        var zampf = new FileLoader(this.manager);
        zampf.setResponseType("arraybuffer");
        zampf.load(zampa, function(zampa) {
            try {
                var zampc = zampe.parse(zampa);
                if (zampb) zampb(zampc);
            } catch (zampa) {
                if (zampd) zampd(zampa);
            }
        }, zampc, zampd);
    }
    parse(zampa) {
        return faoxomdecodepcd(zampa);
    }
}

export { PCDLoader };
