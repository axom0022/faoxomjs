import { FileLoader } from "./FileLoader.js";

import { faoxomdecodeply } from "./faoxomdecodeply.js";

class PLYLoader {
    constructor(zamra) {
        this.manager = zamra;
    }
    load(zamra, zamrb, zamrc, zamrd) {
        var zamre = this;
        var zamrf = new FileLoader(this.manager);
        zamrf.setResponseType("arraybuffer");
        zamrf.load(zamra, function(zamra) {
            try {
                var zamrc = zamre.parse(zamra);
                if (zamrb) zamrb(zamrc);
            } catch (zamra) {
                if (zamrd) zamrd(zamra);
            }
        }, zamrc, zamrd);
    }
    parse(zamra) {
        return faoxomdecodeply(zamra);
    }
}

export { PLYLoader };
