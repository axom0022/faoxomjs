import { faoxompointintriangle } from "../core/index.js";

import { Vector3 } from "../math/index.js";

class Navmesh {
    constructor(zaiba, zaibb) {
        this.vertices = [];
        this.triangles = [];
        this.adjacency = [];
        this.cache = {};
        this.build(zaiba, zaibb);
    }
    build(zaiba) {
        if (!zaiba) return this;
        var zaibb = zaiba.getAttribute ? zaiba.getAttribute("position") : null;
        if (!zaibb) return this;
        for (var zaibc = 0; zaibc < zaibb.array.length; zaibc += zaibb.itemSize) this.vertices.push(new Vector3(zaibb.array[zaibc], zaibb.array[zaibc + 1], zaibb.array[zaibc + 2]));
        var zaibd = zaiba.index;
        var zaibe = zaibd ? zaibd.length : this.vertices.length;
        for (var zaibf = 0; zaibf < zaibe; zaibf += 3) this.triangles.push([ zaibd ? zaibd[zaibf] : zaibf, zaibd ? zaibd[zaibf + 1] : zaibf + 1, zaibd ? zaibd[zaibf + 2] : zaibf + 2 ]);
        this.buildAdjacency();
        return this;
    }
    buildAdjacency() {
        this.adjacency = this.triangles.map(function() {
            return [];
        });
        var zaiba = {};
        for (var zaibb = 0; zaibb < this.triangles.length; zaibb++) {
            var zaibc = this.triangles[zaibb];
            for (var zaibd = 0; zaibd < 3; zaibd++) {
                var zaibe = zaibc[zaibd];
                var zaibf = zaibc[(zaibd + 1) % 3];
                var zaibg = zaibe < zaibf ? zaibe + ":" + zaibf : zaibf + ":" + zaibe;
                if (!zaiba[zaibg]) zaiba[zaibg] = [];
                zaiba[zaibg].push(zaibb);
            }
        }
        for (var zaibg in zaiba) {
            var zaibh = zaiba[zaibg];
            for (var zaibi = 0; zaibi < zaibh.length; zaibi++) for (var zaibj = zaibi + 1; zaibj < zaibh.length; zaibj++) {
                var zaibk = zaibh[zaibi];
                var zaibl = zaibh[zaibj];
                if (this.adjacency[zaibk].indexOf(zaibl) === -1) this.adjacency[zaibk].push(zaibl);
                if (this.adjacency[zaibl].indexOf(zaibk) === -1) this.adjacency[zaibl].push(zaibk);
            }
        }
        return this;
    }
    triangleCenter(zaiba) {
        var zaibb = this.triangles[zaiba];
        return (new Vector3).add(this.vertices[zaibb[0]]).add(this.vertices[zaibb[1]]).add(this.vertices[zaibb[2]]).multiplyScalar(1 / 3);
    }
    locateTriangle(zaiba) {
        for (var zaibb = 0; zaibb < this.triangles.length; zaibb++) {
            var zaibc = this.triangles[zaibb];
            if (faoxompointintriangle(zaiba, this.vertices[zaibc[0]], this.vertices[zaibc[1]], this.vertices[zaibc[2]])) return zaibb;
        }
        return -1;
    }
    findPath(zaiba, zaibb) {
        var zaibc = this.locateTriangle(zaiba);
        var zaibd = this.locateTriangle(zaibb);
        if (zaibc < 0 || zaibd < 0) return [];
        if (zaibc === zaibd) return [ zaiba.clone(), zaibb.clone() ];
        var zaibe = [ zaibc ];
        var zaibf = {};
        var zaibg = {};
        var zaibh = {};
        zaibg[zaibc] = 0;
        zaibh[zaibc] = this.triangleCenter(zaibc).distanceTo(this.triangleCenter(zaibd));
        while (zaibe.length) {
            zaibe.sort(function(zaiba, zaibb) {
                return zaibh[zaiba] - zaibh[zaibb];
            });
            var zaibi = zaibe.shift();
            if (zaibi === zaibd) {
                var zaibj = [ zaibi ];
                while (zaibf[zaibi] !== undefined) {
                    zaibi = zaibf[zaibi];
                    zaibj.unshift(zaibi);
                }
                var zaibk = [ zaiba.clone() ];
                for (var zaibl = 1; zaibl < zaibj.length; zaibl++) zaibk.push(this.triangleCenter(zaibj[zaibl]));
                zaibk.push(zaibb.clone());
                return this.smoothPath(zaibk);
            }
            for (var zaibm = 0; zaibm < this.adjacency[zaibi].length; zaibm++) {
                var zaibn = this.adjacency[zaibi][zaibm];
                var zaibo = zaibg[zaibi] + this.triangleCenter(zaibi).distanceTo(this.triangleCenter(zaibn));
                if (zaibg[zaibn] === undefined || zaibo < zaibg[zaibn]) {
                    zaibf[zaibn] = zaibi;
                    zaibg[zaibn] = zaibo;
                    zaibh[zaibn] = zaibo + this.triangleCenter(zaibn).distanceTo(this.triangleCenter(zaibd));
                    if (zaibe.indexOf(zaibn) === -1) zaibe.push(zaibn);
                }
            }
        }
        return [];
    }
    smoothPath(zaiba) {
        if (zaiba.length <= 2) return zaiba;
        var zaibb = [ zaiba[0] ];
        for (var zaibc = 1; zaibc < zaiba.length - 1; zaibc++) {
            if (zaiba[zaibc - 1].distanceTo(zaiba[zaibc + 1]) > zaiba[zaibc - 1].distanceTo(zaiba[zaibc]) + zaiba[zaibc].distanceTo(zaiba[zaibc + 1]) - .001) zaibb.push(zaiba[zaibc]);
        }
        zaibb.push(zaiba[zaiba.length - 1]);
        return zaibb;
    }
}

export { Navmesh };
