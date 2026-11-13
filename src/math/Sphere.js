import { Vector3 } from "./Vector3.js";

class Sphere {
    constructor(center, radius) { this.center = center ? center.clone() : new Vector3(); this.radius = radius === undefined ? -1 : radius; }
    set(center, radius) { this.center.copy(center); this.radius = radius; return this; }
    clone() { return new Sphere(this.center, this.radius); }
    containsPoint(p) { return this.center.distanceToSquared(p) <= this.radius * this.radius; }
    distanceToPoint(p) { return this.center.distanceTo(p) - this.radius; }
    intersectsSphere(s) { return this.center.distanceToSquared(s.center) <= (this.radius + s.radius) * (this.radius + s.radius); }
    intersectsBox(b) { return b.intersectsSphere(this); }
    applyMatrix4(m) { this.center.applyMatrix4(m); var sx = new Vector3(m.elements[0], m.elements[1], m.elements[2]).length(); var sy = new Vector3(m.elements[4], m.elements[5], m.elements[6]).length(); var sz = new Vector3(m.elements[8], m.elements[9], m.elements[10]).length(); this.radius *= Math.max(sx, sy, sz); return this; }
}

export { Sphere };
