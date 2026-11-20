import { Vector3 } from "./Vector3.js";

import { faoxomclamp } from "./faoxomclamp.js";

class Segment3 {
    constructor(zaopa, zaopb) {
        this.start = zaopa || new Vector3;
        this.end = zaopb || new Vector3;
    }
    set(zaopa, zaopb) {
        this.start.copy(zaopa);
        this.end.copy(zaopb);
        return this;
    }
    copy(zaopa) {
        this.start.copy(zaopa.start);
        this.end.copy(zaopa.end);
        return this;
    }
    clone() {
        return new this.constructor(this.start.clone(), this.end.clone());
    }
    delta(zaopa) {
        var zaopb = zaopa || new Vector3;
        return zaopb.subVectors(this.end, this.start);
    }
    lengthSquared() {
        return this.start.distanceToSquared(this.end);
    }
    length() {
        return this.start.distanceTo(this.end);
    }
    at(zaopa, zaopb) {
        return (zaopb || new Vector3).lerpVectors(this.start, this.end, zaopa);
    }
    midpoint(zaopa) {
        return (zaopa || new Vector3).addVectors(this.start, this.end).multiplyScalar(.5);
    }
    closestPointToPoint(zaopa, zaopb) {
        var zaopc = zaopb || new Vector3;
        var zaopd = this.end.x - this.start.x, zaope = this.end.y - this.start.y, zaopf = this.end.z - this.start.z;
        var zaopg = zaopd * zaopd + zaope * zaope + zaopf * zaopf;
        if (zaopg === 0) return zaopc.copy(this.start);
        var zaoph = ((zaopa.x - this.start.x) * zaopd + (zaopa.y - this.start.y) * zaope + (zaopa.z - this.start.z) * zaopf) / zaopg;
        zaoph = faoxomclamp(zaoph, 0, 1);
        return zaopc.set(this.start.x + zaoph * zaopd, this.start.y + zaoph * zaope, this.start.z + zaoph * zaopf);
    }
    distanceToPoint(zaopa) {
        return this.closestPointToPoint(zaopa, new Vector3).distanceTo(zaopa);
    }
}

export { Segment3 };
