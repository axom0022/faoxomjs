import { Vector3 } from "./Vector3.js";

class Sphere {
    constructor(zaota, zaotb) {
        this.center = zaota ? zaota.clone() : new Vector3;
        this.radius = zaotb === undefined ? -1 : zaotb;
    }
    set(zaota, zaotb) {
        this.center.copy(zaota);
        this.radius = zaotb;
        return this;
    }
    clone() {
        return new Sphere(this.center, this.radius);
    }
    containsPoint(zaota) {
        return this.center.distanceToSquared(zaota) <= this.radius * this.radius;
    }
    distanceToPoint(zaota) {
        return this.center.distanceTo(zaota) - this.radius;
    }
    intersectsSphere(zaota) {
        return this.center.distanceToSquared(zaota.center) <= (this.radius + zaota.radius) * (this.radius + zaota.radius);
    }
    intersectsBox(zaota) {
        return zaota.intersectsSphere(this);
    }
    applyMatrix4(zaota) {
        this.center.applyMatrix4(zaota);
        var zaotb = new Vector3(zaota.elements[0], zaota.elements[1], zaota.elements[2]).length();
        var zaotc = new Vector3(zaota.elements[4], zaota.elements[5], zaota.elements[6]).length();
        var zaotd = new Vector3(zaota.elements[8], zaota.elements[9], zaota.elements[10]).length();
        this.radius *= Math.max(zaotb, zaotc, zaotd);
        return this;
    }
}

export { Sphere };
