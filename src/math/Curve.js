import { Vector3 } from "./Vector3.js";

import { faoxomclamp } from "./faoxomclamp.js";

class Curve {
    constructor() {
        this.type = "Curve";
        this.arcLengthDivisions = 200;
        this.needsUpdate = false;
        this.cacheArcLengths = [];
    }
    getPoint(zaoca, zaocb) {
        var zaocc = zaocb || new Vector3;
        return zaocc;
    }
    getPointAt(zaoca, zaocb) {
        var zaocc = this.getUtoTmapping(zaoca);
        return this.getPoint(zaocc, zaocb);
    }
    getPoints(zaoca) {
        var zaocb = zaoca || 50, zaocc = [];
        for (var zaocd = 0; zaocd <= zaocb; zaocd++) zaocc.push(this.getPoint(zaocd / zaocb));
        return zaocc;
    }
    getSpacedPoints(zaoca) {
        var zaocb = zaoca || 50, zaocc = [];
        for (var zaocd = 0; zaocd <= zaocb; zaocd++) zaocc.push(this.getPointAt(zaocd / zaocb));
        return zaocc;
    }
    getLength() {
        var zaoca = this.getLengths();
        return zaoca[zaoca.length - 1];
    }
    getLengths(zaoca) {
        var zaocb = zaoca || this.arcLengthDivisions;
        if (this.cacheArcLengths && this.cacheArcLengths.length === zaocb + 1 && !this.needsUpdate) return this.cacheArcLengths;
        this.needsUpdate = false;
        var zaocc = [ 0 ], zaocd = this.getPoint(0), zaoce = 0;
        for (var zaocf = 1; zaocf <= zaocb; zaocf++) {
            var zaocg = this.getPoint(zaocf / zaocb);
            zaoce += zaocg.distanceTo(zaocd);
            zaocc.push(zaoce);
            zaocd = zaocg;
        }
        this.cacheArcLengths = zaocc;
        return zaocc;
    }
    getUtoTmapping(zaoca, zaocb) {
        var zaocc = this.getLengths(), zaocd = zaocc.length, zaoce = zaocb !== undefined ? zaocb : zaoca * zaocc[zaocd - 1];
        var zaocf = 0, zaocg = zaocd - 1, zaoch;
        while (zaocf <= zaocg) {
            zaoch = Math.floor(zaocf + (zaocg - zaocf) / 2);
            var zaoci = zaocc[zaoch] - zaoce;
            if (zaoci < 0) zaocf = zaoch + 1; else if (zaoci > 0) zaocg = zaoch - 1; else {
                zaocg = zaoch;
                break;
            }
        }
        zaoch = zaocg;
        if (zaocc[zaoch] === zaoce) return zaoch / (zaocd - 1);
        var zaocj = zaocc[zaoch], zaock = zaocc[zaoch + 1], zaocl = zaock - zaocj;
        var zaocm = (zaoce - zaocj) / zaocl;
        return (zaoch + zaocm) / (zaocd - 1);
    }
    getTangent(zaoca, zaocb) {
        var zaocc = 1e-4, zaocd = Math.max(0, zaoca - zaocc), zaoce = Math.min(1, zaoca + zaocc);
        var zaocf = this.getPoint(zaocd), zaocg = this.getPoint(zaoce);
        var zaoch = zaocb || new Vector3;
        return zaoch.subVectors(zaocg, zaocf).normalize();
    }
    getTangentAt(zaoca, zaocb) {
        var zaocc = this.getUtoTmapping(zaoca);
        return this.getTangent(zaocc, zaocb);
    }
    computeFrenetFrames(zaoca, zaocb) {
        var zaocc = new Vector3, zaocd = [], zaoce = [], zaocf = [];
        var zaocg = new Vector3;
        var zaoch = zaoca || 50;
        for (var zaoci = 0; zaoci <= zaoch; zaoci++) zaocd.push(this.getTangentAt(zaoci / zaoch, new Vector3));
        zaoce[0] = new Vector3;
        zaocf[0] = new Vector3;
        var zaocj = Number.MAX_VALUE, zaock = Math.abs(zaocd[0].x), zaocl = Math.abs(zaocd[0].y), zaocm = Math.abs(zaocd[0].z);
        if (zaock <= zaocj) {
            zaocj = zaock;
            zaocc.set(1, 0, 0);
        }
        if (zaocl <= zaocj) {
            zaocj = zaocl;
            zaocc.set(0, 1, 0);
        }
        if (zaocm <= zaocj) {
            zaocc.set(0, 0, 1);
        }
        zaocg.crossVectors(zaocd[0], zaocc).normalize();
        zaoce[0].crossVectors(zaocd[0], zaocg);
        zaocf[0].crossVectors(zaocd[0], zaoce[0]);
        for (var zaocn = 1; zaocn <= zaoch; zaocn++) {
            zaoce[zaocn] = zaoce[zaocn - 1].clone();
            zaocf[zaocn] = zaocf[zaocn - 1].clone();
            zaocg.crossVectors(zaocd[zaocn - 1], zaocd[zaocn]);
            if (zaocg.length() > 1e-4) {
                zaocg.normalize();
                var zaoco = Math.acos(faoxomclamp(zaocd[zaocn - 1].dot(zaocd[zaocn]), -1, 1));
                zaoce[zaocn].applyAxisAngle(zaocg, zaoco);
            }
            zaocf[zaocn].crossVectors(zaocd[zaocn], zaoce[zaocn]);
        }
        if (zaocb) {
            var zaocp = Math.acos(faoxomclamp(zaoce[0].dot(zaoce[zaoch]), -1, 1));
            zaocp /= zaoch;
            if (zaocd[0].dot(zaocg.crossVectors(zaoce[0], zaoce[zaoch])) > 0) zaocp = -zaocp;
            for (var zaocq = 1; zaocq <= zaoch; zaocq++) {
                zaoce[zaocq].applyAxisAngle(zaocd[zaocq], zaocp * zaocq);
                zaocf[zaocq].crossVectors(zaocd[zaocq], zaoce[zaocq]);
            }
        }
        return {
            tangents: zaocd,
            normals: zaoce,
            binormals: zaocf
        };
    }
}

export { Curve };
