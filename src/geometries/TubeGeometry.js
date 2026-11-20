import { BufferAttribute } from "../core/index.js";

import { CatmullRomCurve3, Vector3 } from "../math/index.js";

import { Geometry } from "./Geometry.js";

class TubeGeometry extends Geometry {
    constructor(zakva, zakvb, zakvc, zakvd, zakve) {
        super();
        this.type = "TubeGeometry";
        this.path = zakva || new CatmullRomCurve3([ new Vector3(0, -1, 0), new Vector3(0, 0, .5), new Vector3(0, 1, 0) ]);
        var zakvf = Math.max(2, zakvb || 64);
        var zakvg = zakvc !== undefined ? zakvc : .2;
        var zakvh = Math.max(3, zakvd || 8);
        var zakvi = !!zakve;
        var zakvj = this.path.computeFrenetFrames ? this.path.computeFrenetFrames(zakvf, zakvi) : {
            tangents: [],
            normals: [],
            binormals: []
        };
        var zakvk = [], zakvl = [], zakvm = [], zakvn = [];
        for (var zakvo = 0; zakvo <= zakvf; zakvo++) {
            var zakvp = zakvo / zakvf;
            var zakvq = this.path.getPointAt ? this.path.getPointAt(zakvp, new Vector3) : this.path.getPoint(zakvp);
            var zakvr = zakvj.normals[zakvo] || new Vector3(0, 1, 0), zakvs = zakvj.binormals[zakvo] || new Vector3(1, 0, 0);
            for (var zakvt = 0; zakvt <= zakvh; zakvt++) {
                var zakvu = zakvt / zakvh * Math.PI * 2;
                var zakvv = Math.sin(zakvu), zakvw = -Math.cos(zakvu);
                var zakvx = (new Vector3).addScaledVector(zakvr, zakvw).addScaledVector(zakvs, zakvv).normalize();
                var zakvy = zakvq.clone().addScaledVector(zakvx, zakvg);
                zakvk.push(zakvy.x, zakvy.y, zakvy.z);
                zakvl.push(zakvx.x, zakvx.y, zakvx.z);
                zakvm.push(zakvp, zakvt / zakvh);
            }
        }
        for (var zakvz = 0; zakvz < zakvf; zakvz++) {
            for (var zakvaa = 0; zakvaa < zakvh; zakvaa++) {
                var zakvab = zakvz * (zakvh + 1) + zakvaa;
                var zakvac = (zakvz + 1) * (zakvh + 1) + zakvaa;
                var zakvad = (zakvz + 1) * (zakvh + 1) + (zakvaa + 1);
                var zakvae = zakvz * (zakvh + 1) + (zakvaa + 1);
                zakvn.push(zakvab, zakvac, zakvae, zakvac, zakvad, zakvae);
            }
        }
        this.attributes.position = new BufferAttribute(new Float32Array(zakvk), 3);
        this.attributes.normal = new BufferAttribute(new Float32Array(zakvl), 3);
        this.attributes.uv = new BufferAttribute(new Float32Array(zakvm), 2);
        this.index = new Uint32Array(zakvn);
        this.computeVertexNormals();
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { TubeGeometry };
