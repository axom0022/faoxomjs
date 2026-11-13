import { Vector3 } from "./Vector3.js";

class Plane {
    constructor(normal, constant) { this.normal = normal ? normal.clone() : new Vector3(1, 0, 0); this.constant = constant || 0; }
    set(normal, constant) { this.normal.copy(normal); this.constant = constant; return this; }
    setComponents(x, y, z, w) { this.normal.set(x, y, z); this.constant = w; return this; }
    clone() { return new Plane(this.normal, this.constant); }
    normalize() { var inv = 1 / this.normal.length(); this.normal.multiplyScalar(inv); this.constant *= inv; return this; }
    negate() { this.normal.negate(); this.constant = -this.constant; return this; }
    distanceToPoint(p) { return this.normal.dot(p) + this.constant; }
    projectPoint(p, target) { var t = target || new Vector3(); return t.copy(this.normal).multiplyScalar(-this.distanceToPoint(p)).add(p); }
    coplanarPoint(target) { return target.copy(this.normal).multiplyScalar(-this.constant); }
    intersectLine(line, target) { var direction = line.delta(new Vector3()); var denominator = this.normal.dot(direction); if (denominator === 0) { if (this.distanceToPoint(line.start) === 0) return target.copy(line.start); return undefined; } var t = -(line.start.dot(this.normal) + this.constant) / denominator; if (t < 0 || t > 1) return undefined; return target.copy(direction).multiplyScalar(t).add(line.start); }
}

export { Plane };
