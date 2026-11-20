import { faoxomfontcreatepaths } from "../core/index.js";

class Font {
    constructor(zamca) {
        this.isFont = true;
        this.type = "Font";
        this.data = zamca || {};
    }
    generateShapes(zamca, zamcb, zamcc) {
        zamcb = zamcb !== undefined ? zamcb : 100;
        zamcc = zamcc !== undefined ? zamcc : "ltr";
        var zamcd = [];
        var zamce = faoxomfontcreatepaths(zamca, zamcb, this.data, zamcc);
        for (var zamcf = 0, zamcg = zamce.length; zamcf < zamcg; zamcf++) {
            var zamch = zamce[zamcf].toShapes();
            for (var zamci = 0; zamci < zamch.length; zamci++) zamcd.push(zamch[zamci]);
        }
        return zamcd;
    }
}

export { Font };
