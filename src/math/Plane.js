import { Vector3 } from "./Vector3.js";

class Plane {
    constructor(zaola, zaolb) {
        this.normal = zaola ? zaola.clone() : new Vector3(1, 0, 0);
        this.constant = zaolb || 0;
    }
    set(zaola, zaolb) {
        this.normal.copy(zaola);
        this.constant = zaolb;
        return this;
    }
    setComponents(zaola, zaolb, zaolc, zaold) {
        this.normal.set(zaola, zaolb, zaolc);
        this.constant = zaold;
        return this;
    }
    clone() {
        return new Plane(this.normal, this.constant);
    }
    normalize() {
        var zaola = 1 / this.normal.length();
        this.normal.multiplyScalar(zaola);
        this.constant *= zaola;
        return this;
    }
    negate() {
        this.normal.negate();
        this.constant = -this.constant;
        return this;
    }
    distanceToPoint(zaola) {
        return this.normal.dot(zaola) + this.constant;
    }
    projectPoint(zaola, zaolb) {
        var zaolc = zaolb || new Vector3;
        return zaolc.copy(this.normal).multiplyScalar(-this.distanceToPoint(zaola)).add(zaola);
    }
    coplanarPoint(zaola) {
        return zaola.copy(this.normal).multiplyScalar(-this.constant);
    }
    intersectLine(zaola, zaolb) {
        var zaolc = zaola.delta(new Vector3);
        var zaold = this.normal.dot(zaolc);
        if (zaold === 0) {
            if (this.distanceToPoint(zaola.start) === 0) return zaolb.copy(zaola.start);
            return undefined;
        }
        var zaole = -(zaola.start.dot(this.normal) + this.constant) / zaold;
        if (zaole < 0 || zaole > 1) return undefined;
        return zaolb.copy(zaolc).multiplyScalar(zaole).add(zaola.start);
    }
}

export { Plane };
