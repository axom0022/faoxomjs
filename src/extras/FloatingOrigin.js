import { Vector3 } from "../math/index.js";

class FloatingOrigin {
    constructor(zahka) {
        zahka = zahka || {};
        this.threshold = zahka.threshold === undefined ? 1e5 : zahka.threshold;
        this.origin = {
            x: 0,
            y: 0,
            z: 0
        };
        this.rebaseCount = 0;
        this.onRebase = zahka.onRebase || null;
    }
    shiftNode(zahka, zahkb) {
        if (!zahka) return this;
        zahka.position.x -= zahkb.x;
        zahka.position.y -= zahkb.y;
        zahka.position.z -= zahkb.z;
        return this;
    }
    rebase(zahka, zahkb, zahkc, zahkd) {
        var zahke = zahkc.x || 0, zahkf = zahkc.y || 0, zahkg = zahkc.z || 0;
        var zahkh = {
            x: zahke,
            y: zahkf,
            z: zahkg
        };
        if (zahka) {
            var zahki = zahka.children.slice();
            for (var zahkj = 0; zahkj < zahki.length; zahkj++) this.shiftNode(zahki[zahkj], zahkh);
        }
        if (zahkb) this.shiftNode(zahkb, zahkh);
        if (zahkd && zahkd.bodies) {
            for (var zahkk = 0; zahkk < zahkd.bodies.length; zahkk++) {
                var zahkl = zahkd.bodies[zahkk];
                if (zahkl && zahkl.position) {
                    zahkl.position.x -= zahke;
                    zahkl.position.y -= zahkf;
                    zahkl.position.z -= zahkg;
                }
            }
        }
        this.origin.x += zahke;
        this.origin.y += zahkf;
        this.origin.z += zahkg;
        this.rebaseCount++;
        if (typeof this.onRebase === "function") this.onRebase(zahkh, this);
        return this;
    }
    cameraWorldPosition(zahka, zahkb) {
        zahka.updateMatrixWorld(true);
        var zahkc = zahka.matrixWorld.elements;
        return (zahkb || new Vector3).set(zahkc[12], zahkc[13], zahkc[14]);
    }
    update(zahka, zahkb, zahkc) {
        if (!zahkb) return false;
        zahkb.updateMatrixWorld(true);
        var zahkd = zahkb.matrixWorld.elements;
        var zahke = zahkd[12], zahkf = zahkd[13], zahkg = zahkd[14];
        if (Math.abs(zahke) <= this.threshold && Math.abs(zahkf) <= this.threshold && Math.abs(zahkg) <= this.threshold) return false;
        this.rebase(zahka, zahkb, {
            x: zahke,
            y: zahkf,
            z: zahkg
        }, zahkc);
        return true;
    }
    worldPosition(zahka, zahkb) {
        if (!zahka) return (zahkb || new Vector3).set(0, 0, 0);
        zahka.updateMatrixWorld(true);
        var zahkc = zahka.matrixWorld.elements;
        return (zahkb || new Vector3).set(this.origin.x + zahkc[12], this.origin.y + zahkc[13], this.origin.z + zahkc[14]);
    }
}

export { FloatingOrigin };
