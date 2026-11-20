import { FileLoader } from "./FileLoader.js";

import { faoxomdecodemd2 } from "./faoxomdecodemd2.js";

class MD2Loader {
    constructor(zamka) {
        this.manager = zamka;
    }
    load(zamka, zamkb, zamkc, zamkd) {
        var zamke = this;
        var zamkf = new FileLoader(this.manager);
        zamkf.setResponseType("arraybuffer");
        zamkf.load(zamka, function(zamka) {
            try {
                var zamkc = zamke.parse(zamka);
                if (zamkb) zamkb(zamkc);
            } catch (zamka) {
                if (zamkd) zamkd(zamka);
            }
        }, zamkc, zamkd);
    }
    parse(zamka) {
        return faoxomdecodemd2(zamka);
    }
}

export { MD2Loader };
