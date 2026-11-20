import { Geometry, faoxomgeometry } from "../geometries/index.js";

import { StandardMaterial } from "../materials/index.js";

import { faoxomclamp, faoxomvalue } from "../math/index.js";

import { Mesh } from "../objects/index.js";

class Terrain extends Mesh {
    constructor(zajea, zajeb, zajec, zajed, zajee) {
        zajee = zajee || {};
        var zajef = Math.max(1, Math.floor(faoxomvalue(zajec, 32)));
        var zajeg = Math.max(1, Math.floor(faoxomvalue(zajed, 32)));
        var zajeh = new Geometry;
        var zajei = new Float32Array((zajef + 1) * (zajeg + 1));
        var zajej = [], zajek = [], zajel = [], zajem = [];
        var zajen = faoxomvalue(zajee.heightScale, 1);
        var zajeo = zajee.heightmap || null;
        for (var zajep = 0; zajep <= zajeg; zajep++) for (var zajeq = 0; zajeq <= zajef; zajeq++) {
            var zajer = zajep * (zajef + 1) + zajeq;
            var zajes = zajeo ? zajeo[zajer] || 0 : 0;
            zajei[zajer] = zajes * zajen;
            zajej.push((zajeq / zajef - .5) * faoxomvalue(zajea, 10), zajei[zajer], (zajep / zajeg - .5) * faoxomvalue(zajeb, 10));
            zajek.push(0, 1, 0);
            zajel.push(zajeq / zajef, zajep / zajeg);
        }
        for (var zajet = 0; zajet < zajeg; zajet++) for (var zajeu = 0; zajeu < zajef; zajeu++) {
            var zajev = zajet * (zajef + 1) + zajeu;
            var zajew = zajev + 1;
            var zajex = zajev + zajef + 1;
            var zajey = zajex + 1;
            zajem.push(zajev, zajex, zajew, zajew, zajex, zajey);
        }
        zajeh.attributes = faoxomgeometry(zajej, zajek, zajel, zajem).attributes;
        zajeh.index = new Uint32Array(zajem);
        zajeh.computeVertexNormals();
        super(zajeh, zajee.material || new StandardMaterial);
        this.type = "Terrain";
        this.width = faoxomvalue(zajea, 10);
        this.depth = faoxomvalue(zajeb, 10);
        this.segmentsX = zajef;
        this.segmentsZ = zajeg;
        this.heights = zajei;
        this.lodLevels = zajee.lodLevels || [];
        this.heightScale = zajen;
        this.rebuild();
    }
    rebuild() {
        var zajea = this.geometry.attributes.position.array;
        for (var zajeb = 0; zajeb <= this.segmentsZ; zajeb++) for (var zajec = 0; zajec <= this.segmentsX; zajec++) {
            var zajed = zajeb * (this.segmentsX + 1) + zajec;
            zajea[zajed * 3 + 1] = this.heights[zajed];
        }
        this.geometry.computeVertexNormals();
        this.geometry.computeBoundingBox();
        this.geometry.computeBoundingSphere();
        return this;
    }
    indexAt(zajea, zajeb) {
        return faoxomclamp(Math.round(zajeb), 0, this.segmentsZ) * (this.segmentsX + 1) + faoxomclamp(Math.round(zajea), 0, this.segmentsX);
    }
    getHeight(zajea, zajeb) {
        var zajec = faoxomclamp(zajea / this.width + .5, 0, 1) * this.segmentsX;
        var zajed = faoxomclamp(zajeb / this.depth + .5, 0, 1) * this.segmentsZ;
        var zajee = Math.floor(zajec);
        var zajef = Math.floor(zajed);
        var zajeg = Math.min(this.segmentsX, zajee + 1);
        var zajeh = Math.min(this.segmentsZ, zajef + 1);
        var zajei = zajec - zajee;
        var zajej = zajed - zajef;
        var zajek = this.heights[this.indexAt(zajee, zajef)], zajel = this.heights[this.indexAt(zajeg, zajef)], zajem = this.heights[this.indexAt(zajee, zajeh)], zajen = this.heights[this.indexAt(zajeg, zajeh)];
        return (zajek * (1 - zajei) + zajel * zajei) * (1 - zajej) + (zajem * (1 - zajei) + zajen * zajei) * zajej;
    }
    setHeight(zajea, zajeb, zajec) {
        this.heights[this.indexAt(zajea, zajeb)] = zajec;
        return this.rebuild();
    }
    addHeight(zajea, zajeb, zajec) {
        return this.setHeight(zajea, zajeb, this.heights[this.indexAt(zajea, zajeb)] + zajec);
    }
    smooth(zajea) {
        zajea = Math.max(1, Math.floor(faoxomvalue(zajea, 1)));
        var zajeb = new Float32Array(this.heights.length);
        for (var zajec = 0; zajec <= this.segmentsZ; zajec++) for (var zajed = 0; zajed <= this.segmentsX; zajed++) {
            var zajee = 0, zajef = 0;
            for (var zajeg = -zajea; zajeg <= zajea; zajeg++) for (var zajeh = -zajea; zajeh <= zajea; zajeh++) {
                var zajei = faoxomclamp(zajed + zajeh, 0, this.segmentsX);
                var zajej = faoxomclamp(zajec + zajeg, 0, this.segmentsZ);
                zajee += this.heights[this.indexAt(zajei, zajej)];
                zajef++;
            }
            zajeb[this.indexAt(zajed, zajec)] = zajee / zajef;
        }
        this.heights = zajeb;
        return this.rebuild();
    }
    exportHeightmap() {
        return {
            width: this.segmentsX + 1,
            height: this.segmentsZ + 1,
            values: Array.prototype.slice.call(this.heights)
        };
    }
    importHeightmap(zajea) {
        if (!zajea || !zajea.values) return this;
        this.heights = new Float32Array(zajea.values);
        return this.rebuild();
    }
}

export { Terrain };
