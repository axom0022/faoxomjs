import { Vector3 } from "./Vector3.js";
import { faoxomclamp } from "./faoxomclamp.js";
import { faoxomvalue } from "./faoxomvalue.js";

class Quaternion {
    constructor(x, y, z, w) { this._x = faoxomvalue(x, 0); this._y = faoxomvalue(y, 0); this._z = faoxomvalue(z, 0); this._w = w === undefined ? 1 : w; this.onChange = function() {}; }
    get x() { return this._x; } set x(value) { this._x = value; this.onChange(); }
    get y() { return this._y; } set y(value) { this._y = value; this.onChange(); }
    get z() { return this._z; } set z(value) { this._z = value; this.onChange(); }
    get w() { return this._w; } set w(value) { this._w = value; this.onChange(); }
    set(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; this.onChange(); return this; }
    clone() { var q = new Quaternion(this.x, this.y, this.z, this.w); q.onChange = this.onChange; return q; }
    copy(q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; this.onChange(); return this; }
    fromArray(array, offset) { offset = offset || 0; return this.set(array[offset] || 0, array[offset + 1] || 0, array[offset + 2] || 0, array[offset + 3] === undefined ? 1 : array[offset + 3]); }
    identity() { return this.set(0, 0, 0, 1); }
    dot(q) { return this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w; }
    lengthSq() { return this.dot(this); }
    length() { return Math.sqrt(this.lengthSq()); }
    normalize() { var l = this.length(); if (l === 0) return this.set(0, 0, 0, 1); return this.set(this.x / l, this.y / l, this.z / l, this.w / l); }
    invert() { return this.conjugate().normalize(); }
    conjugate() { this.x = -this.x; this.y = -this.y; this.z = -this.z; this.onChange(); return this; }
    multiply(q) { return this.multiplyQuaternions(this, q); }
    premultiply(q) { return this.multiplyQuaternions(q, this); }
    multiplyQuaternions(a, b) { var qax = a.x; var qay = a.y; var qaz = a.z; var qaw = a.w; var qbx = b.x; var qby = b.y; var qbz = b.z; var qbw = b.w; this.x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby; this.y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz; this.z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx; this.w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz; this.onChange(); return this; }
    setFromAxisAngle(axis, angle) { var h = angle * 0.5; var s = Math.sin(h); return this.set(axis.x * s, axis.y * s, axis.z * s, Math.cos(h)); }
    setFromUnitVectors(from, to) { var v = new Vector3().crossVectors(from, to); var r = from.dot(to) + 1; if (r < 1e-6) { if (Math.abs(from.x) > Math.abs(from.z)) return this.set(-from.y, from.x, 0, 0).normalize(); return this.set(0, -from.z, from.y, 0).normalize(); } return this.set(v.x, v.y, v.z, r).normalize(); }
    setFromEuler(e) { var x = e.x; var y = e.y; var z = e.z; var c1 = Math.cos(x / 2); var c2 = Math.cos(y / 2); var c3 = Math.cos(z / 2); var s1 = Math.sin(x / 2); var s2 = Math.sin(y / 2); var s3 = Math.sin(z / 2); var order = e.order || "XYZ"; if (order === "XYZ") return this.set(s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3); if (order === "YXZ") return this.set(s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 - s1 * s2 * c3, c1 * c2 * c3 + s1 * s2 * s3); if (order === "ZXY") return this.set(s1 * c2 * c3 - c1 * s2 * s3, c1 * s2 * c3 + s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3); if (order === "ZYX") return this.set(s1 * c2 * c3 - c1 * s2 * s3, c1 * s2 * c3 + s1 * c2 * s3, c1 * c2 * s3 - s1 * s2 * c3, c1 * c2 * c3 + s1 * s2 * s3); if (order === "YZX") return this.set(s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 + s1 * c2 * s3, c1 * c2 * s3 - s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3); return this.set(s1 * c2 * c3 - c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 + s1 * s2 * s3); }
    slerp(qb, t) { if (t <= 0) return this; if (t >= 1) return this.copy(qb); var x = this.x, y = this.y, z = this.z, w = this.w; var cos = x * qb.x + y * qb.y + z * qb.z + w * qb.w; var bx = qb.x, by = qb.y, bz = qb.z, bw = qb.w; if (cos < 0) { cos = -cos; bx = -bx; by = -by; bz = -bz; bw = -bw; } if (cos > 0.9995) return this.set(x + t * (bx - x), y + t * (by - y), z + t * (bz - z), w + t * (bw - w)).normalize(); var theta = Math.acos(faoxomclamp(cos, -1, 1)); var sin = Math.sin(theta); var a = Math.sin((1 - t) * theta) / sin; var b = Math.sin(t * theta) / sin; return this.set(x * a + bx * b, y * a + by * b, z * a + bz * b, w * a + bw * b); }
    setFromRotationMatrix(m) { var te = m.elements; var m11 = te[0], m12 = te[4], m13 = te[8], m21 = te[1], m22 = te[5], m23 = te[9], m31 = te[2], m32 = te[6], m33 = te[10]; var trace = m11 + m22 + m33; var s; if (trace > 0) { s = 0.5 / Math.sqrt(trace + 1); this.w = 0.25 / s; this.x = (m32 - m23) * s; this.y = (m13 - m31) * s; this.z = (m21 - m12) * s; } else if (m11 > m22 && m11 > m33) { s = 2 * Math.sqrt(1 + m11 - m22 - m33); this.w = (m32 - m23) / s; this.x = 0.25 * s; this.y = (m12 + m21) / s; this.z = (m13 + m31) / s; } else if (m22 > m33) { s = 2 * Math.sqrt(1 + m22 - m11 - m33); this.w = (m13 - m31) / s; this.x = (m12 + m21) / s; this.y = 0.25 * s; this.z = (m23 + m32) / s; } else { s = 2 * Math.sqrt(1 + m33 - m11 - m22); this.w = (m21 - m12) / s; this.x = (m13 + m31) / s; this.y = (m23 + m32) / s; this.z = 0.25 * s; } this.onChange(); return this; }
}
Quaternion.prototype.angleTo = function(q) { return 2 * Math.acos(Math.abs(faoxomclamp(this.dot(q), -1, 1))); };
Quaternion.prototype.rotateTowards = function(q, step) { var angle = this.angleTo(q); if (angle === 0) return this; var t = Math.min(1, step / angle); return this.slerp(q, t); };
Quaternion.prototype.equals = function(q) { return this.x === q.x && this.y === q.y && this.z === q.z && this.w === q.w; };
Quaternion.prototype.isQuaternion = true;
Quaternion.prototype.toArray = function(array, offset) { var out = array || [], i = offset || 0; out[i] = this.x; out[i + 1] = this.y; out[i + 2] = this.z; out[i + 3] = this.w; return out; };
Quaternion.prototype.random = function() { var u1 = Math.random(), u2 = Math.random(), u3 = Math.random(), s1 = Math.sqrt(1 - u1), s2 = Math.sqrt(u1), t1 = Math.PI * 2 * u2, t2 = Math.PI * 2 * u3; return this.set(s1 * Math.sin(t1), s1 * Math.cos(t1), s2 * Math.sin(t2), s2 * Math.cos(t2)); };
Quaternion.prototype.slerpQuaternions = function(a, b, t) { return this.copy(a).slerp(b, t); };

export { Quaternion };
