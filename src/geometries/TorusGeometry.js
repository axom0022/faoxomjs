import { faoxomvalue } from "../math/index.js";

import { Geometry } from "./Geometry.js";

import { faoxomgeometry } from "./faoxomgeometry.js";

class TorusGeometry extends Geometry {
    constructor(zakta, zaktb, zaktc, zaktd, zakte) {
        super();
        zakta = faoxomvalue(zakta, 1);
        zaktb = faoxomvalue(zaktb, .4);
        zaktc = Math.max(3, Math.floor(faoxomvalue(zaktc, 12)));
        zaktd = Math.max(3, Math.floor(faoxomvalue(zaktd, 24)));
        zakte = faoxomvalue(zakte, Math.PI * 2);
        var zaktf = [], zaktg = [], zakth = [], zakti = [];
        for (var zaktj = 0; zaktj <= zaktc; zaktj++) for (var zaktk = 0; zaktk <= zaktd; zaktk++) {
            var zaktl = zaktk / zaktd * zakte;
            var zaktm = zaktj / zaktc * Math.PI * 2;
            var zaktn = zakta * Math.cos(zaktl);
            var zakto = zakta * Math.sin(zaktl);
            var zaktp = Math.cos(zaktl) * Math.cos(zaktm);
            var zaktq = Math.sin(zaktl) * Math.cos(zaktm);
            var zaktr = Math.sin(zaktm);
            zaktf.push(zaktn + zaktb * zaktp, zaktb * zaktr, zakto + zaktb * zaktq);
            zaktg.push(zaktp, zaktr, zaktq);
            zakth.push(zaktk / zaktd, zaktj / zaktc);
        }
        for (var zakts = 1; zakts <= zaktc; zakts++) for (var zaktt = 1; zaktt <= zaktd; zaktt++) {
            var zaktu = (zaktd + 1) * (zakts - 1) + zaktt - 1;
            var zaktv = (zaktd + 1) * zakts + zaktt - 1;
            var zaktw = (zaktd + 1) * zakts + zaktt;
            var zaktx = (zaktd + 1) * (zakts - 1) + zaktt;
            zakti.push(zaktu, zaktv, zaktx, zaktv, zaktw, zaktx);
        }
        this.attributes = faoxomgeometry(zaktf, zaktg, zakth, zakti).attributes;
        this.index = zakti.length > 65535 ? new Uint32Array(zakti) : new Uint16Array(zakti);
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { TorusGeometry };
