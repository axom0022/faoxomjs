import { BoxGeometry } from "./BoxGeometry.js";

import { PlaneGeometry } from "./PlaneGeometry.js";

import { SphereGeometry } from "./SphereGeometry.js";

class GeometryFactory {
    constructor(zakha) {
        zakha = zakha || {};
        this.cache = {};
        this.cloneByDefault = !!zakha.clone;
        this.hits = 0;
        this.misses = 0;
    }
    key(zakha, zakhb) {
        return zakha + ":" + zakhb.map(function(zakha) {
            return zakha === undefined ? "d" : String(zakha);
        }).join(",");
    }
    getBox(zakha, zakhb, zakhc, zakhd, zakhe, zakhf, zakhg) {
        zakhg = zakhg || {};
        var zakhh = this.key("box", [ zakha, zakhb, zakhc, zakhd, zakhe, zakhf ]), zakhi = this.cache[zakhh];
        if (zakhi) {
            this.hits++;
            return zakhg.clone || this.cloneByDefault ? zakhi.clone() : zakhi;
        }
        this.misses++;
        zakhi = new BoxGeometry(zakha, zakhb, zakhc, zakhd, zakhe, zakhf);
        this.cache[zakhh] = zakhi;
        return zakhg.clone || this.cloneByDefault ? zakhi.clone() : zakhi;
    }
    box(zakha, zakhb, zakhc, zakhd, zakhe, zakhf, zakhg) {
        return this.getBox(zakha, zakhb, zakhc, zakhd, zakhe, zakhf, zakhg);
    }
    getPlane(zakha, zakhb, zakhc, zakhd, zakhe) {
        zakhe = zakhe || {};
        var zakhf = this.key("plane", [ zakha, zakhb, zakhc, zakhd ]), zakhg = this.cache[zakhf];
        if (zakhg) {
            this.hits++;
            return zakhe.clone || this.cloneByDefault ? zakhg.clone() : zakhg;
        }
        this.misses++;
        zakhg = new PlaneGeometry(zakha, zakhb, zakhc, zakhd);
        this.cache[zakhf] = zakhg;
        return zakhe.clone || this.cloneByDefault ? zakhg.clone() : zakhg;
    }
    plane(zakha, zakhb, zakhc, zakhd, zakhe) {
        return this.getPlane(zakha, zakhb, zakhc, zakhd, zakhe);
    }
    getSphere(zakha, zakhb, zakhc, zakhd) {
        zakhd = zakhd || {};
        var zakhe = this.key("sphere", [ zakha, zakhb, zakhc ]), zakhf = this.cache[zakhe];
        if (zakhf) {
            this.hits++;
            return zakhd.clone || this.cloneByDefault ? zakhf.clone() : zakhf;
        }
        this.misses++;
        zakhf = new SphereGeometry(zakha, zakhb, zakhc);
        this.cache[zakhe] = zakhf;
        return zakhd.clone || this.cloneByDefault ? zakhf.clone() : zakhf;
    }
    sphere(zakha, zakhb, zakhc, zakhd) {
        return this.getSphere(zakha, zakhb, zakhc, zakhd);
    }
    create(zakha, zakhb, zakhc) {
        zakhb = zakhb || [];
        if (zakha === "box") return this.getBox(zakhb[0], zakhb[1], zakhb[2], zakhb[3], zakhb[4], zakhb[5], zakhc);
        if (zakha === "plane") return this.getPlane(zakhb[0], zakhb[1], zakhb[2], zakhb[3], zakhc);
        if (zakha === "sphere") return this.getSphere(zakhb[0], zakhb[1], zakhb[2], zakhc);
        throw new Error("Unsupported cached geometry type " + zakha);
    }
    clear() {
        for (var zakha in this.cache) if (this.cache[zakha] && this.cache[zakha].dispose) this.cache[zakha].dispose();
        this.cache = {};
        this.hits = 0;
        this.misses = 0;
        return this;
    }
    stats() {
        return {
            entries: Object.keys(this.cache).length,
            hits: this.hits,
            misses: this.misses
        };
    }
}

export { GeometryFactory };
