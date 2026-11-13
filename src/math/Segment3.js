import { Vector3 } from "./Vector3.js";
import { faoxomclamp } from "./faoxomclamp.js";

class Segment3 {
    constructor(start, end) { this.start = start || new Vector3(); this.end = end || new Vector3(); }
    set(start, end) { this.start.copy(start); this.end.copy(end); return this; }
    copy(segment) { this.start.copy(segment.start); this.end.copy(segment.end); return this; }
    clone() { return new this.constructor(this.start.clone(), this.end.clone()); }
    delta(target) { var t = target || new Vector3(); return t.subVectors(this.end, this.start); }
    lengthSquared() { return this.start.distanceToSquared(this.end); }
    length() { return this.start.distanceTo(this.end); }
    at(t, target) { return (target || new Vector3()).lerpVectors(this.start, this.end, t); }
    midpoint(target) { return (target || new Vector3()).addVectors(this.start, this.end).multiplyScalar(0.5); }
    closestPointToPoint(point, target) {
        var t = target || new Vector3();
        var dx = this.end.x - this.start.x, dy = this.end.y - this.start.y, dz = this.end.z - this.start.z;
        var lengthSquared = dx * dx + dy * dy + dz * dz;
        if (lengthSquared === 0) return t.copy(this.start);
        var scale = ((point.x - this.start.x) * dx + (point.y - this.start.y) * dy + (point.z - this.start.z) * dz) / lengthSquared;
        scale = faoxomclamp(scale, 0, 1);
        return t.set(this.start.x + scale * dx, this.start.y + scale * dy, this.start.z + scale * dz);
    }
    distanceToPoint(point) { return this.closestPointToPoint(point, new Vector3()).distanceTo(point); }
}

export { Segment3 };
