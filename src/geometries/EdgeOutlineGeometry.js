import { Geometry } from "./Geometry.js";

class EdgeOutlineGeometry extends Geometry {
    constructor(zakea, zakeb) {
        super();
        this.type = "EdgeOutlineGeometry";
        zakeb = zakeb === undefined ? 1 : zakeb;
        var zakec = Math.cos(zakeb * Math.PI / 180);
        var zaked = zakea && zakea.attributes ? zakea.attributes.position : null;
        if (!zaked) {
            this.setAttribute("position", new Float32Array(0), 3);
            return;
        }
        var zakee = zaked.itemSize || 3;
        var zakef = [];
        var zakeg = typeof Map !== "undefined" ? new Map : null;
        var zakeh = [];
        for (var zakei = 0; zakei < zaked.array.length / zakee; zakei++) {
            var zakej = Math.round(zaked.array[zakei * zakee] * 1e4) + "," + Math.round(zaked.array[zakei * zakee + 1] * 1e4) + "," + Math.round(zaked.array[zakei * zakee + 2] * 1e4);
            var zakek = zakeg ? zakeg.get(zakej) : undefined;
            if (zakek === undefined) {
                zakek = zakef.length;
                zakef.push([ zaked.array[zakei * zakee], zaked.array[zakei * zakee + 1], zaked.array[zakei * zakee + 2] ]);
                if (zakeg) zakeg.set(zakej, zakek);
            }
            zakeh[zakei] = zakek;
        }
        var zakel = zakea.index;
        var zakem = zakel ? zakel.length / 3 : zakeh.length / 3;
        var zaken = typeof Map !== "undefined" ? new Map : {};
        var zakeo = [];
        var zakep = function(zakea, zakeb, zaked) {
            var zakee = zakea < zakeb ? zakea + "_" + zakeb : zakeb + "_" + zakea;
            var zakef = typeof Map !== "undefined" ? zaken.get(zakee) : zaken[zakee];
            if (zakef === undefined) {
                var zakeg = {
                    a: zakea,
                    b: zakeb,
                    normal: zaked,
                    count: 1,
                    sharp: false
                };
                zakeo.push(zakeg);
                if (typeof Map !== "undefined") zaken.set(zakee, zakeg); else zaken[zakee] = zakeg;
            } else {
                zakef.count++;
                if (zakef.normal.x * zaked.x + zakef.normal.y * zaked.y + zakef.normal.z * zaked.z < zakec) zakef.sharp = true;
            }
        };
        for (var zakeq = 0; zakeq < zakem; zakeq++) {
            var zaker = zakel ? zakeh[zakel[zakeq * 3]] : zakeh[zakeq * 3];
            var zakes = zakel ? zakeh[zakel[zakeq * 3 + 1]] : zakeh[zakeq * 3 + 1];
            var zaket = zakel ? zakeh[zakel[zakeq * 3 + 2]] : zakeh[zakeq * 3 + 2];
            if (zaker === undefined || zakes === undefined || zaket === undefined) continue;
            var zakeu = zakef[zaker], zakev = zakef[zakes], zakew = zakef[zaket];
            var zakex = zakev[0] - zakeu[0], zakey = zakev[1] - zakeu[1], zakez = zakev[2] - zakeu[2];
            var zakeaa = zakew[0] - zakeu[0], zakeab = zakew[1] - zakeu[1], zakeac = zakew[2] - zakeu[2];
            var zakead = zakey * zakeac - zakez * zakeab, zakeae = zakez * zakeaa - zakex * zakeac, zakeaf = zakex * zakeab - zakey * zakeaa;
            var zakeag = Math.sqrt(zakead * zakead + zakeae * zakeae + zakeaf * zakeaf);
            if (zakeag === 0) continue;
            var zakeah = {
                x: zakead / zakeag,
                y: zakeae / zakeag,
                z: zakeaf / zakeag
            };
            zakep(zaker, zakes, zakeah);
            zakep(zakes, zaket, zakeah);
            zakep(zaket, zaker, zakeah);
        }
        var zakeai = [];
        for (var zakeaj = 0; zakeaj < zakeo.length; zakeaj++) {
            var zakeak = zakeo[zakeaj];
            if (zakeak.count > 1 && !zakeak.sharp) continue;
            zakeai.push(zakef[zakeak.a][0], zakef[zakeak.a][1], zakef[zakeak.a][2], zakef[zakeak.b][0], zakef[zakeak.b][1], zakef[zakeak.b][2]);
        }
        this.setAttribute("position", new Float32Array(zakeai), 3);
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { EdgeOutlineGeometry };
