import { BufferAttribute } from "../core/index.js";

import { Vector2 } from "../math/index.js";

import { Geometry } from "./Geometry.js";

class LatheGeometry extends Geometry {
    constructor(zakja, zakjb, zakjc, zakjd) {
        super();
        this.type = "LatheGeometry";
        var zakje = zakja || [ new Vector2(0, -.5), new Vector2(.5, 0), new Vector2(0, .5) ];
        var zakjf = Math.max(3, zakjb || 12);
        var zakjg = zakjc || 0, zakjh = zakjd || Math.PI * 2;
        var zakji = [], zakjj = [], zakjk = [], zakjl = [];
        for (var zakjm = 0; zakjm <= zakjf; zakjm++) {
            var zakjn = zakjg + zakjm / zakjf * zakjh;
            var zakjo = Math.sin(zakjn), zakjp = Math.cos(zakjn);
            for (var zakjq = 0; zakjq < zakje.length; zakjq++) {
                var zakjr = zakje[zakjq];
                zakji.push(zakjr.x * zakjo, zakjr.y, zakjr.x * zakjp);
                zakjk.push(zakjm / zakjf, zakjq / (zakje.length - 1));
                zakjj.push(zakjo, 0, zakjp);
            }
        }
        var zakjs = zakje.length;
        for (var zakjt = 0; zakjt < zakjf; zakjt++) {
            for (var zakju = 0; zakju < zakjs - 1; zakju++) {
                var zakjv = zakjt * zakjs + zakju;
                var zakjw = (zakjt + 1) * zakjs + zakju;
                var zakjx = (zakjt + 1) * zakjs + (zakju + 1);
                var zakjy = zakjt * zakjs + (zakju + 1);
                zakjl.push(zakjv, zakjw, zakjy, zakjw, zakjx, zakjy);
            }
        }
        this.attributes.position = new BufferAttribute(new Float32Array(zakji), 3);
        this.attributes.normal = new BufferAttribute(new Float32Array(zakjj), 3);
        this.attributes.uv = new BufferAttribute(new Float32Array(zakjk), 2);
        this.index = new Uint32Array(zakjl);
        this.computeVertexNormals();
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { LatheGeometry };
