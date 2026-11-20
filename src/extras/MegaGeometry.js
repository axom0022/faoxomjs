import { Geometry } from "../geometries/Geometry.js";

import { Color, Matrix4, Vector3 } from "../math/index.js";

class MegaGeometry {
    constructor() {
        this.entries = [];
        this.geometry = null;
        this.materials = [];
        this.stats = {
            objects: 0,
            triangles: 0,
            vertices: 0,
            materials: 0,
            drawCalls: 1,
            buildms: 0
        };
    }
    add(zahya, zahyb, zahyc) {
        zahyc = zahyc || {};
        var zahyd = {
            geometry: zahya,
            matrix: zahyb ? zahyb.elements ? Array.prototype.slice.call(zahyb.elements) : (new Matrix4).makeTranslation(zahyb[0] || 0, zahyb[1] || 0, zahyb[2] || 0).elements : null,
            color: zahyc.color !== undefined ? zahyc.color instanceof Color ? zahyc.color : new Color(zahyc.color) : new Color(16777215),
            materialIndex: zahyc.materialIndex !== undefined ? zahyc.materialIndex : this.addMaterial(zahyc),
            name: zahyc.name || ""
        };
        this.entries.push(zahyd);
        return this.entries.length - 1;
    }
    addMaterial(zahya) {
        this.materials.push({
            color: zahya && zahya.color !== undefined ? zahya.color instanceof Color ? zahya.color : new Color(zahya.color) : new Color(16777215),
            roughness: zahya && zahya.roughness !== undefined ? zahya.roughness : .5,
            metalness: zahya && zahya.metalness !== undefined ? zahya.metalness : 0,
            emissive: zahya && zahya.emissive !== undefined ? zahya.emissive instanceof Color ? zahya.emissive : new Color(zahya.emissive) : new Color(0),
            opacity: zahya && zahya.opacity !== undefined ? zahya.opacity : 1
        });
        return this.materials.length - 1;
    }
    uploadMaterials(zahya) {
        var zahyb = [];
        for (var zahyc = 0; zahyc < this.materials.length; zahyc++) zahyb.push(this.materials[zahyc]);
        if (!zahyb.length) zahyb.push({
            color: 16777215,
            roughness: 1,
            metalness: 0
        });
        zahya.setMegaMaterials(zahyb);
        this.stats.materials = zahyb.length;
        return this;
    }
    build() {
        var zahya = typeof performance !== "undefined" ? performance.now() : Date.now();
        var zahyb = [], zahyc = [], zahyd = [], zahye = [], zahyf = [], zahyg = [];
        var zahyh = [];
        var zahyi = 0;
        var zahyj = new Vector3;
        for (var zahyk = 0; zahyk < this.entries.length; zahyk++) {
            var zahyl = this.entries[zahyk];
            var zahym = zahyl.geometry;
            if (!zahym || !zahym.attributes || !zahym.attributes.position) continue;
            var zahyn = zahym.attributes.position.array;
            var zahyo = zahym.attributes.normal ? zahym.attributes.normal.array : null;
            var zahyp = zahym.attributes.uv ? zahym.attributes.uv.array : null;
            var zahyq = zahym.index;
            var zahyr = zahyq ? zahyq.array ? zahyq.array : zahyq : null;
            var zahys = zahyr ? zahyr.length / 3 : zahyn.length / 9;
            var zahyt = zahyl.matrix;
            var zahyu = null;
            if (zahyt && zahyo) zahyu = (new Matrix4).fromArray(zahyt).invert().transpose().elements;
            for (var zahyv = 0; zahyv < zahys; zahyv++) {
                for (var zahyw = 0; zahyw < 3; zahyw++) {
                    var zahyx = zahyr ? zahyr[zahyv * 3 + zahyw] : zahyv * 3 + zahyw;
                    var zahyy = zahyn[zahyx * 3], zahyz = zahyn[zahyx * 3 + 1], zahyaa = zahyn[zahyx * 3 + 2];
                    if (zahyt) {
                        zahyj.set(zahyy, zahyz, zahyaa).applyMatrix4({
                            elements: zahyt
                        });
                        zahyy = zahyj.x;
                        zahyz = zahyj.y;
                        zahyaa = zahyj.z;
                    }
                    zahyb.push(zahyy, zahyz, zahyaa);
                    if (zahyo) {
                        var zahyab = zahyo[zahyx * 3], zahyac = zahyo[zahyx * 3 + 1], zahyad = zahyo[zahyx * 3 + 2];
                        if (zahyu) {
                            var zahyae = zahyu[0] * zahyab + zahyu[4] * zahyac + zahyu[8] * zahyad;
                            var zahyaf = zahyu[1] * zahyab + zahyu[5] * zahyac + zahyu[9] * zahyad;
                            var zahyag = zahyu[2] * zahyab + zahyu[6] * zahyac + zahyu[10] * zahyad;
                            var zahyah = Math.sqrt(zahyae * zahyae + zahyaf * zahyaf + zahyag * zahyag) || 1;
                            zahyab = zahyae / zahyah;
                            zahyac = zahyaf / zahyah;
                            zahyad = zahyag / zahyah;
                        }
                        zahyc.push(zahyab, zahyac, zahyad);
                    } else {
                        zahyc.push(0, 1, 0);
                    }
                    if (zahyp) zahyd.push(zahyp[zahyx * 2], zahyp[zahyx * 2 + 1]); else zahyd.push(0, 0);
                    zahye.push(zahyl.color.r, zahyl.color.g, zahyl.color.b);
                    zahyf.push(zahyk);
                    zahyg.push(zahyl.materialIndex);
                }
                zahyh.push(zahyk);
                zahyi++;
            }
        }
        var zahyai = new Geometry;
        zahyai.setAttribute("position", new Float32Array(zahyb), 3);
        zahyai.setAttribute("normal", new Float32Array(zahyc), 3);
        zahyai.setAttribute("uv", new Float32Array(zahyd), 2);
        zahyai.setAttribute("color", new Float32Array(zahye), 3);
        zahyai.setAttribute("objectId", new Float32Array(zahyf), 1);
        zahyai.setAttribute("materialIndex", new Float32Array(zahyg), 1);
        zahyai.computeBounds();
        this.triangleOwners = new Uint16Array(zahyh.length <= 65535 ? zahyh.length : 0);
        if (zahyh.length <= 65535) {
            for (var zahyaj = 0; zahyaj < zahyh.length; zahyaj++) this.triangleOwners[zahyaj] = zahyh[zahyaj];
        } else {
            this.triangleOwnersBig = new Float32Array(zahyh);
        }
        this.geometry = zahyai;
        this.stats.objects = this.entries.length;
        this.stats.triangles = zahyi;
        this.stats.vertices = zahyb.length / 3;
        this.stats.materials = this.materials.length;
        this.stats.buildms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - zahya;
        return this;
    }
    objectIdOfTriangle(zahya) {
        if (this.triangleOwners && this.triangleOwners.length) return this.triangleOwners[zahya];
        if (this.triangleOwnersBig) return this.triangleOwnersBig[zahya];
        return -1;
    }
    materialIndexOfTriangle(zahya) {
        return this.entries[this.objectIdOfTriangle(zahya)] ? this.entries[this.objectIdOfTriangle(zahya)].materialIndex : -1;
    }
    dispose() {
        this.entries = [];
        this.geometry = null;
        this.materials = [];
        this.triangleOwners = null;
        this.triangleOwnersBig = null;
        this.stats = {
            objects: 0,
            triangles: 0,
            vertices: 0,
            materials: 0,
            drawCalls: 1,
            buildms: 0
        };
    }
}

export { MegaGeometry };
