import { Vector3 } from "./Vector3.js";

class Box3 {
    constructor(min, max) { this.min = min ? min.clone() : new Vector3(Infinity, Infinity, Infinity); this.max = max ? max.clone() : new Vector3(-Infinity, -Infinity, -Infinity); }
    set(min, max) { this.min.copy(min); this.max.copy(max); return this; }
    clone() { return new Box3(this.min, this.max); }
    copy(b) { this.min.copy(b.min); this.max.copy(b.max); return this; }
    makeEmpty() { this.min.set(Infinity, Infinity, Infinity); this.max.set(-Infinity, -Infinity, -Infinity); return this; }
    isEmpty() { return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z; }
    expandByPoint(p) { this.min.min ? this.min.min(p) : (this.min.set(Math.min(this.min.x, p.x), Math.min(this.min.y, p.y), Math.min(this.min.z, p.z))); this.max.set(Math.max(this.max.x, p.x), Math.max(this.max.y, p.y), Math.max(this.max.z, p.z)); return this; }
    setFromPoints(points) { this.makeEmpty(); for (var i = 0; i < points.length; i++) this.expandByPoint(points[i]); return this; }
    getCenter(target) { if (this.isEmpty()) return target.set(0, 0, 0); return target.addVectors(this.min, this.max).multiplyScalar(0.5); }
    getSize(target) { if (this.isEmpty()) return target.set(0, 0, 0); return target.subVectors(this.max, this.min); }
    containsPoint(p) { return p.x >= this.min.x && p.x <= this.max.x && p.y >= this.min.y && p.y <= this.max.y && p.z >= this.min.z && p.z <= this.max.z; }
    intersectsBox(b) { return !(b.max.x < this.min.x || b.min.x > this.max.x || b.max.y < this.min.y || b.min.y > this.max.y || b.max.z < this.min.z || b.min.z > this.max.z); }
    intersectsSphere(s) { return this.distanceToPoint(s.center) <= s.radius; }
    distanceToPoint(p) { var dx = Math.max(this.min.x - p.x, 0, p.x - this.max.x); var dy = Math.max(this.min.y - p.y, 0, p.y - this.max.y); var dz = Math.max(this.min.z - p.z, 0, p.z - this.max.z); return Math.sqrt(dx * dx + dy * dy + dz * dz); }
    union(b) { this.min.set(Math.min(this.min.x, b.min.x), Math.min(this.min.y, b.min.y), Math.min(this.min.z, b.min.z)); this.max.set(Math.max(this.max.x, b.max.x), Math.max(this.max.y, b.max.y), Math.max(this.max.z, b.max.z)); return this; }
    applyMatrix4(m) { if (this.isEmpty()) return this; var p = []; for (var i = 0; i < 8; i++) p.push(new Vector3(i & 1 ? this.max.x : this.min.x, i & 2 ? this.max.y : this.min.y, i & 4 ? this.max.z : this.min.z).applyMatrix4(m)); return this.setFromPoints(p); }
}

export { Box3 };
