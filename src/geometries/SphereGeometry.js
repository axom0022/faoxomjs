import { faoxomvalue } from "../math/index.js";

import { Geometry } from "./Geometry.js";

import { faoxomgeometry } from "./faoxomgeometry.js";

class SphereGeometry extends Geometry {
    constructor(zakqa, zakqb, zakqc, zakqd, zakqe, zakqf, zakqg) {
        super();
        zakqa = faoxomvalue(zakqa, 1);
        zakqb = Math.max(3, Math.floor(faoxomvalue(zakqb, 24)));
        zakqc = Math.max(2, Math.floor(faoxomvalue(zakqc, 16)));
        zakqd = faoxomvalue(zakqd, 0);
        zakqe = faoxomvalue(zakqe, Math.PI * 2);
        zakqf = faoxomvalue(zakqf, 0);
        zakqg = faoxomvalue(zakqg, Math.PI);
        var zakqh = [], zakqi = [], zakqj = [], zakqk = [];
        for (var zakql = 0; zakql <= zakqc; zakql++) {
            var zakqm = zakql / zakqc;
            var zakqn = zakqf + zakqm * zakqg;
            for (var zakqo = 0; zakqo <= zakqb; zakqo++) {
                var zakqp = zakqo / zakqb;
                var zakqq = zakqd + zakqp * zakqe;
                var zakqr = -zakqa * Math.cos(zakqq) * Math.sin(zakqn);
                var zakqs = zakqa * Math.cos(zakqn);
                var zakqt = zakqa * Math.sin(zakqq) * Math.sin(zakqn);
                zakqh.push(zakqr, zakqs, zakqt);
                zakqi.push(zakqr / zakqa, zakqs / zakqa, zakqt / zakqa);
                zakqj.push(zakqp, 1 - zakqm);
            }
        }
        for (var zakqu = 0; zakqu < zakqc; zakqu++) for (var zakqv = 0; zakqv < zakqb; zakqv++) {
            var zakqw = zakqu * (zakqb + 1) + zakqv;
            var zakqx = zakqw + zakqb + 1;
            var zakqy = zakqx + 1;
            var zakqz = zakqw + 1;
            if (zakqu !== 0) zakqk.push(zakqw, zakqx, zakqz);
            if (zakqu !== zakqc - 1) zakqk.push(zakqx, zakqy, zakqz);
        }
        this.attributes = faoxomgeometry(zakqh, zakqi, zakqj, zakqk).attributes;
        this.index = zakqk.length > 65535 ? new Uint32Array(zakqk) : new Uint16Array(zakqk);
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { SphereGeometry };
