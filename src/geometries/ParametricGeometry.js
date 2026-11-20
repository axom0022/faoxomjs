import { BufferAttribute } from "../core/index.js";

import { Vector3 } from "../math/index.js";

import { Geometry } from "./Geometry.js";

class ParametricGeometry extends Geometry {
    constructor(zakma, zakmb, zakmc) {
        super();
        this.type = "ParametricGeometry";
        var zakmd = Math.max(1, zakmb || 16), zakme = Math.max(1, zakmc || 16);
        var zakmf = [], zakmg = [], zakmh = [], zakmi = [];
        var zakmj = new Vector3;
        var zakmk = zakma || function(zakma, zakmb, zakmc) {
            zakmc.set((zakma - .5) * 2, 0, (zakmb - .5) * 2);
        };
        for (var zakml = 0; zakml <= zakme; zakml++) {
            var zakmm = zakml / zakme;
            for (var zakmn = 0; zakmn <= zakmd; zakmn++) {
                var zakmo = zakmn / zakmd;
                zakmk(zakmo, zakmm, zakmj);
                zakmf.push(zakmj.x, zakmj.y, zakmj.z);
                zakmg.push(0, 1, 0);
                zakmh.push(zakmo, zakmm);
            }
        }
        for (var zakmp = 0; zakmp < zakme; zakmp++) {
            for (var zakmq = 0; zakmq < zakmd; zakmq++) {
                var zakmr = zakmp * (zakmd + 1) + zakmq;
                var zakms = (zakmp + 1) * (zakmd + 1) + zakmq;
                var zakmt = (zakmp + 1) * (zakmd + 1) + (zakmq + 1);
                var zakmu = zakmp * (zakmd + 1) + (zakmq + 1);
                zakmi.push(zakmr, zakms, zakmu, zakms, zakmt, zakmu);
            }
        }
        this.attributes.position = new BufferAttribute(new Float32Array(zakmf), 3);
        this.attributes.normal = new BufferAttribute(new Float32Array(zakmg), 3);
        this.attributes.uv = new BufferAttribute(new Float32Array(zakmh), 2);
        this.index = new Uint32Array(zakmi);
        this.computeVertexNormals();
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { ParametricGeometry };
