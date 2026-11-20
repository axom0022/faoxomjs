import { Vector3, faoxomvalue } from "../math/index.js";

import { Geometry } from "./Geometry.js";

import { faoxomgeometry } from "./faoxomgeometry.js";

class CylinderGeometry extends Geometry {
    constructor(zakca, zakcb, zakcc, zakcd, zakce, zakcf) {
        super();
        zakca = faoxomvalue(zakca, 1);
        zakcb = faoxomvalue(zakcb, zakca);
        zakcc = faoxomvalue(zakcc, 1);
        zakcd = Math.max(3, Math.floor(faoxomvalue(zakcd, 16)));
        zakce = Math.max(1, Math.floor(faoxomvalue(zakce, 1)));
        zakcf = !!zakcf;
        var zakcg = [], zakch = [], zakci = [], zakcj = [];
        for (var zakck = 0; zakck <= zakce; zakck++) {
            var zakcl = zakck / zakce;
            var zakcm = zakcb + (zakca - zakcb) * zakcl;
            for (var zakcn = 0; zakcn <= zakcd; zakcn++) {
                var zakco = zakcn / zakcd * Math.PI * 2;
                zakcg.push(zakcm * Math.cos(zakco), zakcl * zakcc - zakcc / 2, zakcm * Math.sin(zakco));
                var zakcp = (zakcb - zakca) / zakcc;
                var zakcq = new Vector3(Math.cos(zakco), zakcp, Math.sin(zakco)).normalize();
                zakch.push(zakcq.x, zakcq.y, zakcq.z);
                zakci.push(zakcn / zakcd, zakcl);
            }
        }
        for (var zakcr = 0; zakcr < zakce; zakcr++) for (var zakcs = 0; zakcs < zakcd; zakcs++) {
            var zakct = zakcr * (zakcd + 1) + zakcs;
            var zakcu = zakct + zakcd + 1;
            zakcj.push(zakct, zakcu, zakct + 1, zakcu, zakcu + 1, zakct + 1);
        }
        if (!zakcf && zakca > 0) {
            var zakcv = zakcg.length / 3;
            zakcg.push(0, zakcc / 2, 0);
            zakch.push(0, 1, 0);
            zakci.push(.5, .5);
            for (var zakcw = 0; zakcw < zakcd; zakcw++) zakcj.push(zakcv, zakce * (zakcd + 1) + zakcw + 1, zakce * (zakcd + 1) + zakcw);
        }
        if (!zakcf && zakcb > 0) {
            var zakcx = zakcg.length / 3;
            zakcg.push(0, -zakcc / 2, 0);
            zakch.push(0, -1, 0);
            zakci.push(.5, .5);
            for (var zakcy = 0; zakcy < zakcd; zakcy++) zakcj.push(zakcx, zakcy, zakcy + 1);
        }
        this.attributes = faoxomgeometry(zakcg, zakch, zakci, zakcj).attributes;
        this.index = zakcj.length > 65535 ? new Uint32Array(zakcj) : new Uint16Array(zakcj);
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { CylinderGeometry };
