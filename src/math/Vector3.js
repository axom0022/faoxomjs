import { Quaternion } from "./Quaternion.js";
import { faoxomclamp } from "./faoxomclamp.js";
import { faoxomvalue } from "./faoxomvalue.js";

class Vector3 {
    constructor(x, y, z) { this.x = faoxomvalue(x, 0); this.y = faoxomvalue(y, 0); this.z = faoxomvalue(z, 0); }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    setX(x) { this.x = x; return this; }
    setY(y) { this.y = y; return this; }
    setZ(z) { this.z = z; return this; }
    setScalar(s) { this.x = s; this.y = s; this.z = s; return this; }
    clone() { return new Vector3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    addScalar(s) { this.x += s; this.y += s; this.z += s; return this; }
    addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
    addVectors(a, b) { this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
    subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
    multiply(v) { this.x *= v.x; this.y *= v.y; this.z *= v.z; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    divideScalar(s) { return this.multiplyScalar(s === 0 ? 0 : 1 / s); }
    negate() { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    cross(v) { return this.crossVectors(this, v); }
    crossVectors(a, b) { var ax = a.x; var ay = a.y; var az = a.z; var bx = b.x; var by = b.y; var bz = b.z; this.x = ay * bz - az * by; this.y = az * bx - ax * bz; this.z = ax * by - ay * bx; return this; }
    lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
    length() { return Math.sqrt(this.lengthSq()); }
    normalize() { return this.divideScalar(this.length() || 1); }
    distanceTo(v) { return Math.sqrt(this.distanceToSquared(v)); }
    distanceToSquared(v) { var x = this.x - v.x; var y = this.y - v.y; var z = this.z - v.z; return x * x + y * y + z * z; }
    lerp(v, alpha) { this.x += (v.x - this.x) * alpha; this.y += (v.y - this.y) * alpha; this.z += (v.z - this.z) * alpha; return this; }
    lerpVectors(a, b, alpha) { this.x = a.x + (b.x - a.x) * alpha; this.y = a.y + (b.y - a.y) * alpha; this.z = a.z + (b.z - a.z) * alpha; return this; }
    applyMatrix4(m) { var e = m.elements; var x = this.x; var y = this.y; var z = this.z; var w = e[3] * x + e[7] * y + e[11] * z + e[15]; w = w || 1; this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) / w; this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) / w; this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) / w; return this; }
    transformDirection(m) { var e = m.elements; var x = this.x; var y = this.y; var z = this.z; this.x = e[0] * x + e[4] * y + e[8] * z; this.y = e[1] * x + e[5] * y + e[9] * z; this.z = e[2] * x + e[6] * y + e[10] * z; return this.normalize(); }
    applyQuaternion(q) { var x = this.x; var y = this.y; var z = this.z; var qx = q.x; var qy = q.y; var qz = q.z; var qw = q.w; var ix = qw * x + qy * z - qz * y; var iy = qw * y + qz * x - qx * z; var iz = qw * z + qx * y - qy * x; var iw = -qx * x - qy * y - qz * z; this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy; this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz; this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx; return this; }
    applyAxisAngle(axis, angle) { return this.applyQuaternion(new Quaternion().setFromAxisAngle(axis, angle)); }
    setFromMatrixPosition(m) { var e = m.elements; this.x = e[12]; this.y = e[13]; this.z = e[14]; return this; }
    setFromMatrixScale(m) { var e = m.elements; this.x = Math.hypot(e[0], e[1], e[2]); this.y = Math.hypot(e[4], e[5], e[6]); this.z = Math.hypot(e[8], e[9], e[10]); return this; }
    project(camera) { return this.applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix); }
    unproject(camera) { return this.applyMatrix4(camera.projectionMatrixInverse).applyMatrix4(camera.matrixWorld); }
    fromArray(a, offset) { var i = faoxomvalue(offset, 0); this.x = a[i] || 0; this.y = a[i + 1] || 0; this.z = a[i + 2] || 0; return this; }
    toArray(a, offset) { var out = a || []; var i = faoxomvalue(offset, 0); out[i] = this.x; out[i + 1] = this.y; out[i + 2] = this.z; return out; }
    equals(v) { return this.x === v.x && this.y === v.y && this.z === v.z; }
}
Vector3.prototype.min = function(v) { this.x = Math.min(this.x, v.x); this.y = Math.min(this.y, v.y); this.z = Math.min(this.z, v.z); return this; };
Vector3.prototype.max = function(v) { this.x = Math.max(this.x, v.x); this.y = Math.max(this.y, v.y); this.z = Math.max(this.z, v.z); return this; };
Vector3.prototype.setLength = function(length) { return this.normalize().multiplyScalar(length); };
Vector3.prototype.clampLength = function(min, max) { var length = this.length(); return this.multiplyScalar(length === 0 ? 1 : faoxomclamp(length, min, max) / length); };
Vector3.prototype.projectOnVector = function(vector) { var denominator = vector.lengthSq(); if (denominator === 0) return this.set(0, 0, 0); return this.copy(vector).multiplyScalar(this.dot(vector) / denominator); };
Vector3.prototype.projectOnPlane = function(planeNormal) { var projection = this.clone().projectOnVector(planeNormal); return this.sub(projection); };
Vector3.prototype.reflect = function(normal) { return this.sub(normal.clone().multiplyScalar(2 * this.dot(normal))); };
Vector3.prototype.manhattanDistanceTo = function(v) { return Math.abs(this.x - v.x) + Math.abs(this.y - v.y) + Math.abs(this.z - v.z); };
Vector3.prototype.angleTo = function(v) { return Math.acos(faoxomclamp(this.dot(v) / ((this.length() * v.length()) || 1), -1, 1)); };
Vector3.prototype.setFromEuler = function(euler) { return this.copy(new Vector3(0, 0, -1).applyQuaternion(new Quaternion().setFromEuler(euler))); };
Vector3.prototype.applyNormalMatrix = function(matrix) { return this.applyMatrix3(matrix).normalize(); };
Vector3.prototype.applyMatrix3 = function(matrix) { var e = matrix.elements, x = this.x, y = this.y, z = this.z; this.x = e[0] * x + e[3] * y + e[6] * z; this.y = e[1] * x + e[4] * y + e[7] * z; this.z = e[2] * x + e[5] * y + e[8] * z; return this; };
Vector3.prototype.setFromBufferAttribute = function(attribute, index) { return this.set(attribute.getX ? attribute.getX(index) : attribute.array[index * attribute.itemSize], attribute.getY ? attribute.getY(index) : attribute.array[index * attribute.itemSize + 1], attribute.getZ ? attribute.getZ(index) : attribute.array[index * attribute.itemSize + 2]); };

export { Vector3 };
