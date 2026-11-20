import { faoxomvalue } from "../math/index.js";

import { Geometry } from "./Geometry.js";

import { faoxomgeometry } from "./faoxomgeometry.js";

class RingGeometry extends Geometry {
    constructor(zakoa, zakob, zakoc, zakod, zakoe, zakof) {
        super();
        zakoa = faoxomvalue(zakoa, .25);
        zakob = faoxomvalue(zakob, .5);
        zakoc = Math.max(3, Math.floor(faoxomvalue(zakoc, 16)));
        zakod = Math.max(1, Math.floor(faoxomvalue(zakod, 1)));
        zakoe = faoxomvalue(zakoe, 0);
        zakof = faoxomvalue(zakof, Math.PI * 2);
        var zakog = [], zakoh = [], zakoi = [], zakoj = [];
        for (var zakok = 0; zakok <= zakod; zakok++) for (var zakol = 0; zakol <= zakoc; zakol++) {
            var zakom = zakoa + (zakob - zakoa) * zakok / zakod;
            var zakon = zakoe + zakof * zakol / zakoc;
            zakog.push(zakom * Math.cos(zakon), zakom * Math.sin(zakon), 0);
            zakoh.push(0, 0, 1);
            zakoi.push(zakol / zakoc, zakok / zakod);
        }
        for (var zakoo = 0; zakoo < zakod; zakoo++) for (var zakop = 0; zakop < zakoc; zakop++) {
            var zakoq = zakoo * (zakoc + 1) + zakop;
            var zakor = zakoq + 1;
            var zakos = zakoq + zakoc + 1;
            var zakot = zakos + 1;
            zakoj.push(zakoq, zakos, zakor, zakor, zakos, zakot);
        }
        this.attributes = faoxomgeometry(zakog, zakoh, zakoi, zakoj).attributes;
        this.index = new Uint16Array(zakoj);
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { RingGeometry };
