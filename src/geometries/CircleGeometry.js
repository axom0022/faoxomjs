import { BufferAttribute } from "../core/index.js";

import { Geometry } from "./Geometry.js";

class CircleGeometry extends Geometry {
    constructor(zakaa, zakab, zakac, zakad) {
        super();
        this.type = "CircleGeometry";
        zakaa = zakaa !== undefined ? zakaa : 1;
        zakab = Math.max(3, zakab || 32);
        zakac = zakac !== undefined ? zakac : 0;
        zakad = zakad !== undefined ? zakad : Math.PI * 2;
        var zakae = [ 0, 0, 0 ], zakaf = [ .5, .5 ], zakag = [ 0, 0, 1 ], zakah = [];
        for (var zakai = 0; zakai <= zakab; zakai++) {
            var zakaj = zakac + zakai / zakab * zakad;
            var zakak = zakaa * Math.cos(zakaj), zakal = zakaa * Math.sin(zakaj);
            zakae.push(zakak, zakal, 0);
            zakaf.push((zakak / zakaa + 1) * .5, (zakal / zakaa + 1) * .5);
            zakag.push(0, 0, 1);
        }
        for (var zakam = 1; zakam <= zakab; zakam++) zakah.push(0, zakam, zakam + 1);
        this.attributes.position = new BufferAttribute(new Float32Array(zakae), 3);
        this.attributes.uv = new BufferAttribute(new Float32Array(zakaf), 2);
        this.attributes.normal = new BufferAttribute(new Float32Array(zakag), 3);
        this.index = new Uint32Array(zakah);
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { CircleGeometry };
