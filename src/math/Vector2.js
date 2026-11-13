import { faoxomclamp } from "./faoxomclamp.js";
import { faoxomvalue } from "./faoxomvalue.js";

class Vector2 {
    constructor(x, y) { this.x = faoxomvalue(x, 0); this.y = faoxomvalue(y, 0); }
    set(x, y) { this.x = x; this.y = y; return this; }
    setX(x) { this.x = x; return this; }
    setY(y) { this.y = y; return this; }
    clone() { return new Vector2(this.x, this.y); }
    copy(v) { this.x = v.x; this.y = v.y; return this; }
    add(v) { this.x += v.x; this.y += v.y; return this; }
    addVectors(a, b) { this.x = a.x + b.x; this.y = a.y + b.y; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; return this; }
    subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; return this; }
    multiply(v) { this.x *= v.x; this.y *= v.y; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; return this; }
    divideScalar(s) { return this.multiplyScalar(s === 0 ? 0 : 1 / s); }
    negate() { this.x = -this.x; this.y = -this.y; return this; }
    dot(v) { return this.x * v.x + this.y * v.y; }
    lengthSq() { return this.x * this.x + this.y * this.y; }
    length() { return Math.sqrt(this.lengthSq()); }
    normalize() { return this.divideScalar(this.length() || 1); }
    distanceTo(v) { return Math.sqrt(this.distanceToSquared(v)); }
    distanceToSquared(v) { var x = this.x - v.x; var y = this.y - v.y; return x * x + y * y; }
    lerp(v, alpha) { this.x += (v.x - this.x) * alpha; this.y += (v.y - this.y) * alpha; return this; }
    rotateAround(center, angle) { var c = Math.cos(angle); var s = Math.sin(angle); var x = this.x - center.x; var y = this.y - center.y; this.x = x * c - y * s + center.x; this.y = x * s + y * c + center.y; return this; }
    fromArray(a, offset) { var i = faoxomvalue(offset, 0); this.x = a[i] || 0; this.y = a[i + 1] || 0; return this; }
    toArray(a, offset) { var out = a || []; var i = faoxomvalue(offset, 0); out[i] = this.x; out[i + 1] = this.y; return out; }
    equals(v) { return this.x === v.x && this.y === v.y; }
}
Vector2.prototype.angle = function() { return Math.atan2(this.y, this.x); };
Vector2.prototype.setLength = function(length) { return this.normalize().multiplyScalar(length); };
Vector2.prototype.clampLength = function(min, max) { var length = this.length(); return this.multiplyScalar(length === 0 ? 1 : faoxomclamp(length, min, max) / length); };
Vector2.prototype.addScaledVector = function(v, s) { this.x += v.x * s; this.y += v.y * s; return this; };
Vector2.prototype.lerpVectors = function(a, b, alpha) { this.x = a.x + (b.x - a.x) * alpha; this.y = a.y + (b.y - a.y) * alpha; return this; };
Vector2.prototype.setScalar = function(s) { this.x = s; this.y = s; return this; };
Vector2.prototype.angleTo = function(v) { return Math.acos(faoxomclamp(this.dot(v) / ((this.length() * v.length()) || 1), -1, 1)); };
Vector2.prototype.cross = function(v) { return this.x * v.y - this.y * v.x; };
Vector2.prototype.min = function(v) { this.x = Math.min(this.x, v.x); this.y = Math.min(this.y, v.y); return this; };
Vector2.prototype.max = function(v) { this.x = Math.max(this.x, v.x); this.y = Math.max(this.y, v.y); return this; };
Vector2.prototype.clamp = function(min, max) { this.x = faoxomclamp(this.x, min.x, max.x); this.y = faoxomclamp(this.y, min.y, max.y); return this; };
Vector2.prototype.setFromBufferAttribute = function(attribute, index) { return this.set(attribute.getX ? attribute.getX(index) : attribute.array[index * attribute.itemSize], attribute.getY ? attribute.getY(index) : attribute.array[index * attribute.itemSize + 1]); };

export { Vector2 };
