import { BufferAttribute } from "../core/index.js";

import { ShapeUtils, faoxomvalue } from "../math/index.js";

import { Geometry } from "./Geometry.js";

class ShapeGeometry extends Geometry {
    constructor(zakpa, zakpb) {
        super();
        this.type = "ShapeGeometry";
        zakpb = Math.max(1, Math.floor(faoxomvalue(zakpb, 12)));
        var zakpc = Array.isArray(zakpa) ? zakpa : [ zakpa ];
        var zakpd = [], zakpe = [], zakpf = [], zakpg = [];
        function zakph(zakpa) {
            var zakpc = zakpe.length / 3;
            var zakph = zakpa.extractPoints(zakpb);
            var zakpi = zakph.shape;
            var zakpj = zakph.holes;
            if (ShapeUtils.isClockWise(zakpi) === false) zakpi = zakpi.reverse();
            for (var zakpk = 0; zakpk < zakpj.length; zakpk++) {
                if (ShapeUtils.isClockWise(zakpj[zakpk]) === true) zakpj[zakpk] = zakpj[zakpk].reverse();
            }
            var zakpl = ShapeUtils.triangulateShape(zakpi, zakpj);
            for (var zakpm = 0; zakpm < zakpj.length; zakpm++) zakpi = zakpi.concat(zakpj[zakpm]);
            for (var zakpn = 0; zakpn < zakpi.length; zakpn++) {
                var zakpo = zakpi[zakpn];
                zakpe.push(zakpo.x, zakpo.y, 0);
                zakpf.push(0, 0, 1);
                zakpg.push(zakpo.x, zakpo.y);
            }
            for (var zakpp = 0; zakpp < zakpl.length; zakpp++) {
                var zakpq = zakpl[zakpp];
                zakpd.push(zakpq[0] + zakpc, zakpq[1] + zakpc, zakpq[2] + zakpc);
            }
        }
        for (var zakpi = 0; zakpi < zakpc.length; zakpi++) {
            var zakpj = zakpc[zakpi];
            if (zakpj.extractPoints) zakph(zakpj); else {
                var zakpk = zakpj.getPoints ? zakpj.getPoints(zakpb) : zakpj.points || [];
                if (zakpk.length < 3) continue;
                var zakpl = zakpk.length, zakpm = zakpe.length / 3;
                for (var zakpn = 0; zakpn < zakpl; zakpn++) {
                    zakpe.push(zakpk[zakpn].x, zakpk[zakpn].y, 0);
                    zakpf.push(0, 0, 1);
                    zakpg.push(zakpk[zakpn].x, zakpk[zakpn].y);
                }
                for (var zakpo = 1; zakpo < zakpl - 1; zakpo++) zakpd.push(zakpm, zakpm + zakpo, zakpm + zakpo + 1);
            }
        }
        this.attributes.position = new BufferAttribute(new Float32Array(zakpe), 3);
        this.attributes.uv = new BufferAttribute(new Float32Array(zakpg), 2);
        this.attributes.normal = new BufferAttribute(new Float32Array(zakpf), 3);
        this.index = new Uint32Array(zakpd);
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { ShapeGeometry };
