import { faoxomvalue } from "../math/index.js";

import { Geometry } from "./Geometry.js";

import { faoxomgeometry } from "./faoxomgeometry.js";

class PlaneGeometry extends Geometry {
    constructor(zakna, zaknb, zaknc, zaknd) {
        super();
        zakna = faoxomvalue(zakna, 1);
        zaknb = faoxomvalue(zaknb, 1);
        zaknc = Math.max(1, Math.floor(faoxomvalue(zaknc, 1)));
        zaknd = Math.max(1, Math.floor(faoxomvalue(zaknd, 1)));
        var zakne = [], zaknf = [], zakng = [], zaknh = [];
        for (var zakni = 0; zakni <= zaknd; zakni++) for (var zaknj = 0; zaknj <= zaknc; zaknj++) {
            zakne.push((zaknj / zaknc - .5) * zakna, (zakni / zaknd - .5) * zaknb, 0);
            zaknf.push(0, 0, 1);
            zakng.push(zaknj / zaknc, zakni / zaknd);
        }
        for (var zaknk = 0; zaknk < zaknd; zaknk++) for (var zaknl = 0; zaknl < zaknc; zaknl++) {
            var zaknm = zaknk * (zaknc + 1) + zaknl;
            var zaknn = zaknm + 1;
            var zakno = zaknm + zaknc + 1;
            var zaknp = zakno + 1;
            zaknh.push(zaknm, zaknn, zaknp, zaknm, zaknp, zakno);
        }
        this.attributes = faoxomgeometry(zakne, zaknf, zakng, zaknh).attributes;
        this.index = new Uint16Array(zaknh);
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { PlaneGeometry };
