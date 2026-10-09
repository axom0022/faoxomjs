var faoxomId = 1;
function faoxomIdNext() { return faoxomId++; }
function faoxomValue(value, fallback) { return value === undefined || value === null ? fallback : value; }
function faoxomClamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function faoxomArray(value) { return value instanceof Float32Array || value instanceof Float64Array || value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof Uint16Array || value instanceof Uint32Array || value instanceof Int8Array || value instanceof Int16Array || value instanceof Int32Array ? value : Array.isArray(value) ? value : []; }

class Vector2 {
    constructor(x, y) { this.x = faoxomValue(x, 0); this.y = faoxomValue(y, 0); }
    set(x, y) { this.x = x; this.y = y; return this; }
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
    fromArray(a, offset) { var i = faoxomValue(offset, 0); this.x = a[i] || 0; this.y = a[i + 1] || 0; return this; }
    toArray(a, offset) { var out = a || []; var i = faoxomValue(offset, 0); out[i] = this.x; out[i + 1] = this.y; return out; }
    equals(v) { return this.x === v.x && this.y === v.y; }
}

class Vector3 {
    constructor(x, y, z) { this.x = faoxomValue(x, 0); this.y = faoxomValue(y, 0); this.z = faoxomValue(z, 0); }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
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
    setFromMatrixPosition(m) { var e = m.elements; this.x = e[12]; this.y = e[13]; this.z = e[14]; return this; }
    fromArray(a, offset) { var i = faoxomValue(offset, 0); this.x = a[i] || 0; this.y = a[i + 1] || 0; this.z = a[i + 2] || 0; return this; }
    toArray(a, offset) { var out = a || []; var i = faoxomValue(offset, 0); out[i] = this.x; out[i + 1] = this.y; out[i + 2] = this.z; return out; }
    equals(v) { return this.x === v.x && this.y === v.y && this.z === v.z; }
}

class Vector4 {
    constructor(x, y, z, w) { this.x = faoxomValue(x, 0); this.y = faoxomValue(y, 0); this.z = faoxomValue(z, 0); this.w = faoxomValue(w, 0); }
    set(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; }
    clone() { return new Vector4(this.x, this.y, this.z, this.w); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; this.w = v.w; return this; }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; this.w += v.w; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; this.w -= v.w; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; this.w *= s; return this; }
    divideScalar(s) { return this.multiplyScalar(s === 0 ? 0 : 1 / s); }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w; }
    lengthSq() { return this.dot(this); }
    length() { return Math.sqrt(this.lengthSq()); }
    normalize() { return this.divideScalar(this.length() || 1); }
    lerp(v, alpha) { this.x += (v.x - this.x) * alpha; this.y += (v.y - this.y) * alpha; this.z += (v.z - this.z) * alpha; this.w += (v.w - this.w) * alpha; return this; }
    fromArray(a, offset) { var i = faoxomValue(offset, 0); this.x = a[i] || 0; this.y = a[i + 1] || 0; this.z = a[i + 2] || 0; this.w = a[i + 3] || 0; return this; }
    toArray(a, offset) { var out = a || []; var i = faoxomValue(offset, 0); out[i] = this.x; out[i + 1] = this.y; out[i + 2] = this.z; out[i + 3] = this.w; return out; }
}

class Euler {
    constructor(x, y, z, order, onChange) { this.x = faoxomValue(x, 0); this.y = faoxomValue(y, 0); this.z = faoxomValue(z, 0); this.order = order || "YXZ"; this.onChange = onChange || function() {}; }
    set(x, y, z, order) { this.x = x; this.y = y; this.z = z; if (order) this.order = order; this.onChange(); return this; }
    clone() { return new Euler(this.x, this.y, this.z, this.order, this.onChange); }
    copy(e) { this.x = e.x; this.y = e.y; this.z = e.z; this.order = e.order; this.onChange(); return this; }
    setFromQuaternion(q, order) { var m = new Matrix4().makeRotationFromQuaternion(q); var e = m.elements; var ord = order || this.order; if (ord === "XYZ") { this.y = Math.asin(faoxomClamp(e[8], -1, 1)); if (Math.abs(e[8]) < 0.99999) { this.x = Math.atan2(-e[9], e[10]); this.z = Math.atan2(-e[4], e[0]); } else { this.x = Math.atan2(e[6], e[5]); this.z = 0; } } else { this.y = Math.asin(faoxomClamp(-e[2], -1, 1)); this.x = Math.atan2(e[6], e[10]); this.z = Math.atan2(e[1], e[0]); } this.order = ord; this.onChange(); return this; }
}

class Quaternion {
    constructor(x, y, z, w) { this.x = faoxomValue(x, 0); this.y = faoxomValue(y, 0); this.z = faoxomValue(z, 0); this.w = w === undefined ? 1 : w; this.onChange = function() {}; }
    set(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; this.onChange(); return this; }
    clone() { var q = new Quaternion(this.x, this.y, this.z, this.w); q.onChange = this.onChange; return q; }
    copy(q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; this.onChange(); return this; }
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
    setFromEuler(e) { var x = e.x; var y = e.y; var z = e.z; var c1 = Math.cos(x / 2); var c2 = Math.cos(y / 2); var c3 = Math.cos(z / 2); var s1 = Math.sin(x / 2); var s2 = Math.sin(y / 2); var s3 = Math.sin(z / 2); var order = e.order || "XYZ"; if (order === "XYZ") return this.set(s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3); if (order === "YXZ") return this.set(s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 - s1 * s2 * c3, c1 * c2 * c3 + s1 * s2 * s3); if (order === "ZXY") return this.set(s1 * c2 * c3 - c1 * s2 * s3, c1 * s2 * c3 + s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3); if (order === "ZYX") return this.set(s1 * c2 * c3 - c1 * s2 * s3, c1 * s2 * c3 + s1 * c2 * s3, c1 * c2 * s3 - s1 * s2 * c3, c1 * c2 * c3 + s1 * s2 * s3); if (order === "YZX") return this.set(s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 + s1 * c2 * s3, c1 * c2 * s3 - s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3); return this.set(s1 * c2 * c3 - c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 + s1 * s2 * s3); }
    slerp(qb, t) { if (t <= 0) return this; if (t >= 1) return this.copy(qb); var x = this.x, y = this.y, z = this.z, w = this.w; var cos = x * qb.x + y * qb.y + z * qb.z + w * qb.w; var bx = qb.x, by = qb.y, bz = qb.z, bw = qb.w; if (cos < 0) { cos = -cos; bx = -bx; by = -by; bz = -bz; bw = -bw; } if (cos > 0.9995) return this.set(x + t * (bx - x), y + t * (by - y), z + t * (bz - z), w + t * (bw - w)).normalize(); var theta = Math.acos(faoxomClamp(cos, -1, 1)); var sin = Math.sin(theta); var a = Math.sin((1 - t) * theta) / sin; var b = Math.sin(t * theta) / sin; return this.set(x * a + bx * b, y * a + by * b, z * a + bz * b, w * a + bw * b); }
    setFromRotationMatrix(m) { var te = m.elements; var m11 = te[0], m12 = te[4], m13 = te[8], m21 = te[1], m22 = te[5], m23 = te[9], m31 = te[2], m32 = te[6], m33 = te[10]; var trace = m11 + m22 + m33; var s; if (trace > 0) { s = 0.5 / Math.sqrt(trace + 1); this.w = 0.25 / s; this.x = (m32 - m23) * s; this.y = (m13 - m31) * s; this.z = (m21 - m12) * s; } else if (m11 > m22 && m11 > m33) { s = 2 * Math.sqrt(1 + m11 - m22 - m33); this.w = (m32 - m23) / s; this.x = 0.25 * s; this.y = (m12 + m21) / s; this.z = (m13 + m31) / s; } else if (m22 > m33) { s = 2 * Math.sqrt(1 + m22 - m11 - m33); this.w = (m13 - m31) / s; this.x = (m12 + m21) / s; this.y = 0.25 * s; this.z = (m23 + m32) / s; } else { s = 2 * Math.sqrt(1 + m33 - m11 - m22); this.w = (m21 - m12) / s; this.x = (m13 + m31) / s; this.y = (m23 + m32) / s; this.z = 0.25 * s; } this.onChange(); return this; }
}

class Matrix4 {
    constructor() { this.elements = new Float32Array(16); this.identity(); }
    set(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44) { var te = this.elements; te[0] = n11; te[4] = n12; te[8] = n13; te[12] = n14; te[1] = n21; te[5] = n22; te[9] = n23; te[13] = n24; te[2] = n31; te[6] = n32; te[10] = n33; te[14] = n34; te[3] = n41; te[7] = n42; te[11] = n43; te[15] = n44; return this; }
    identity() { return this.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1); }
    clone() { return new Matrix4().fromArray(this.elements); }
    copy(m) { this.elements.set(m.elements); return this; }
    fromArray(a, offset) { var i = faoxomValue(offset, 0); for (var j = 0; j < 16; j++) this.elements[j] = a[i + j]; return this; }
    toArray(a, offset) { var out = a || []; var i = faoxomValue(offset, 0); for (var j = 0; j < 16; j++) out[i + j] = this.elements[j]; return out; }
    multiply(m) { return this.multiplyMatrices(this, m); }
    premultiply(m) { return this.multiplyMatrices(m, this); }
    multiplyMatrices(a, b) { var ae = a.elements, be = b.elements, te = this.elements; var a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12], a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13], a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14], a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15]; var b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12], b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13], b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14], b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15]; te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41; te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42; te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43; te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44; te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41; te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42; te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43; te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44; te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41; te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42; te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43; te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44; te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41; te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42; te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43; te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44; return this; }
    determinant() { var te = this.elements; var n11 = te[0], n12 = te[4], n13 = te[8], n14 = te[12], n21 = te[1], n22 = te[5], n23 = te[9], n24 = te[13], n31 = te[2], n32 = te[6], n33 = te[10], n34 = te[14], n41 = te[3], n42 = te[7], n43 = te[11], n44 = te[15]; return n41 * (n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34) + n42 * (n11 * n23 * n34 - n11 * n24 * n33 + n14 * n21 * n33 - n13 * n21 * n34 + n13 * n24 * n31 - n14 * n23 * n31) + n43 * (n11 * n24 * n32 - n11 * n22 * n34 - n14 * n21 * n32 + n12 * n21 * n34 + n14 * n22 * n31 - n12 * n24 * n31) + n44 * (-n13 * n22 * n31 - n11 * n23 * n32 + n11 * n22 * n33 + n13 * n21 * n32 - n12 * n21 * n33 + n12 * n23 * n31); }
    invert() { var a = this.elements; var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15]; var b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32; var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (det === 0) return this.identity(); var inv = 1 / det; var te = this.elements; te[0] = (a11 * b11 - a12 * b10 + a13 * b09) * inv; te[1] = (a02 * b10 - a01 * b11 - a03 * b09) * inv; te[2] = (a31 * b05 - a32 * b04 + a33 * b03) * inv; te[3] = (a22 * b04 - a21 * b05 - a23 * b03) * inv; te[4] = (a12 * b08 - a10 * b11 - a13 * b07) * inv; te[5] = (a00 * b11 - a02 * b08 + a03 * b07) * inv; te[6] = (a32 * b02 - a30 * b05 - a33 * b01) * inv; te[7] = (a20 * b05 - a22 * b02 + a23 * b01) * inv; te[8] = (a10 * b10 - a11 * b08 + a13 * b06) * inv; te[9] = (a01 * b08 - a00 * b10 - a03 * b06) * inv; te[10] = (a30 * b04 - a31 * b02 + a33 * b00) * inv; te[11] = (a21 * b02 - a20 * b04 - a23 * b00) * inv; te[12] = (a11 * b07 - a10 * b09 - a12 * b06) * inv; te[13] = (a00 * b09 - a01 * b07 + a02 * b06) * inv; te[14] = (a31 * b01 - a30 * b03 - a32 * b00) * inv; te[15] = (a20 * b03 - a21 * b01 + a22 * b00) * inv; return this; }
    transpose() { var e = this.elements; var t; t = e[1]; e[1] = e[4]; e[4] = t; t = e[2]; e[2] = e[8]; e[8] = t; t = e[6]; e[6] = e[9]; e[9] = t; t = e[3]; e[3] = e[12]; e[12] = t; t = e[7]; e[7] = e[13]; e[13] = t; t = e[11]; e[11] = e[14]; e[14] = t; return this; }
    makeTranslation(x, y, z) { return this.set(1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1); }
    makeScale(x, y, z) { return this.set(x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1); }
    makeRotationFromQuaternion(q) { var x = q.x, y = q.y, z = q.z, w = q.w; var x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2; return this.set(1 - (yy + zz), xy - wz, xz + wy, 0, xy + wz, 1 - (xx + zz), yz - wx, 0, xz - wy, yz + wx, 1 - (xx + yy), 0, 0, 0, 0, 1); }
    compose(position, quaternion, scale) { var te = this.elements; this.makeRotationFromQuaternion(quaternion); te[0] *= scale.x; te[1] *= scale.x; te[2] *= scale.x; te[4] *= scale.y; te[5] *= scale.y; te[6] *= scale.y; te[8] *= scale.z; te[9] *= scale.z; te[10] *= scale.z; te[12] = position.x; te[13] = position.y; te[14] = position.z; return this; }
    decompose(position, quaternion, scale) { var te = this.elements; var sx = new Vector3(te[0], te[1], te[2]).length(); var sy = new Vector3(te[4], te[5], te[6]).length(); var sz = new Vector3(te[8], te[9], te[10]).length(); if (this.determinant() < 0) sx = -sx; position.set(te[12], te[13], te[14]); scale.set(sx, sy, sz); var matrix = this.clone(); var me = matrix.elements; me[0] /= sx; me[1] /= sx; me[2] /= sx; me[4] /= sy; me[5] /= sy; me[6] /= sy; me[8] /= sz; me[9] /= sz; me[10] /= sz; quaternion.setFromRotationMatrix(matrix); return this; }
    makePerspective(fov, aspect, near, far) { var f = 1 / Math.tan(fov * Math.PI / 360); var nf = 1 / (near - far); return this.set(f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, 2 * far * near * nf, 0, 0, -1, 0); }
    makeOrthographic(left, right, top, bottom, near, far) { var w = 1 / (right - left), h = 1 / (top - bottom), p = 1 / (far - near), x = (right + left) * w, y = (top + bottom) * h, z = (far + near) * p; return this.set(2 * w, 0, 0, -x, 0, 2 * h, 0, -y, 0, 0, -2 * p, -z, 0, 0, 0, 1); }
    lookAt(eye, target, up) { var z = new Vector3().subVectors(eye, target).normalize(); if (z.lengthSq() === 0) z.z = 1; var x = new Vector3().crossVectors(up, z).normalize(); if (x.lengthSq() === 0) { z.x += 0.0001; x.crossVectors(up, z).normalize(); } var y = new Vector3().crossVectors(z, x); return this.set(x.x, y.x, z.x, eye.x, x.y, y.y, z.y, eye.y, x.z, y.z, z.z, eye.z, 0, 0, 0, 1); }
}

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

class Ray {
    constructor(origin, direction) { this.origin = origin ? origin.clone() : new Vector3(); this.direction = direction ? direction.clone().normalize() : new Vector3(0, 0, -1); }
    set(origin, direction) { this.origin.copy(origin); this.direction.copy(direction).normalize(); return this; }
    clone() { return new Ray(this.origin, this.direction); }
    at(t, target) { return (target || new Vector3()).copy(this.direction).multiplyScalar(t).add(this.origin); }
    lookAt(v) { this.direction.copy(v).sub(this.origin).normalize(); return this; }
    recast(t) { this.origin.copy(this.at(t, new Vector3())); return this; }
    distanceToPoint(point) { var directionDistance = this.direction.dot(new Vector3().subVectors(point, this.origin)); var v = this.at(directionDistance, new Vector3()); return v.distanceTo(point); }
    intersectSphere(sphere, target) { var v1 = new Vector3().subVectors(sphere.center, this.origin); var tca = v1.dot(this.direction); var d2 = v1.dot(v1) - tca * tca; var radius2 = sphere.radius * sphere.radius; if (d2 > radius2) return undefined; var thc = Math.sqrt(Math.max(0, radius2 - d2)); var t0 = tca - thc; var t1 = tca + thc; if (t1 < 0) return undefined; return this.at(t0 < 0 ? t1 : t0, target || new Vector3()); }
    intersectBox(box, target) { var tmin = 0; var tmax = Infinity; var axes = ["x", "y", "z"]; for (var i = 0; i < 3; i++) { var axis = axes[i]; var direction = this.direction[axis]; var origin = this.origin[axis]; if (Math.abs(direction) < 1e-12) { if (origin < box.min[axis] || origin > box.max[axis]) return undefined; continue; } var a = (box.min[axis] - origin) / direction; var b = (box.max[axis] - origin) / direction; if (a > b) { var swap = a; a = b; b = swap; } tmin = Math.max(tmin, a); tmax = Math.min(tmax, b); if (tmin > tmax) return undefined; } if (tmax < 0) return undefined; return this.at(tmin >= 0 ? tmin : tmax, target || new Vector3()); }
    intersectTriangle(a, b, c, backfaceCulling, target) { var edge1 = new Vector3().subVectors(b, a); var edge2 = new Vector3().subVectors(c, a); var pvec = new Vector3().crossVectors(this.direction, edge2); var det = edge1.dot(pvec); var epsilon = 1e-8; if (backfaceCulling ? det <= epsilon : Math.abs(det) <= epsilon) return undefined; var invdet = 1 / det; var tvec = new Vector3().subVectors(this.origin, a); var u = tvec.dot(pvec) * invdet; if (u < 0 || u > 1) return undefined; var qvec = new Vector3().crossVectors(tvec, edge1); var v = this.direction.dot(qvec) * invdet; if (v < 0 || u + v > 1) return undefined; var t = edge2.dot(qvec) * invdet; if (t < 0) return undefined; return this.at(t, target || new Vector3()); }
}

class Color {
    constructor(r, g, b) { this.r = 1; this.g = 1; this.b = 1; if (r !== undefined) this.set(r, g, b); }
    set(value, g, b) { if (value instanceof Color) return this.copy(value); if (typeof value === "number" && g === undefined) return this.setHex(value); this.r = faoxomValue(value, 1); this.g = faoxomValue(g, 1); this.b = faoxomValue(b, 1); return this; }
    setRGB(r, g, b) { return this.set(r, g, b); }
    setHex(hex) { this.r = ((hex >> 16) & 255) / 255; this.g = ((hex >> 8) & 255) / 255; this.b = (hex & 255) / 255; return this; }
    clone() { return new Color(this.r, this.g, this.b); }
    copy(c) { this.r = c.r; this.g = c.g; this.b = c.b; return this; }
    add(c) { this.r += c.r; this.g += c.g; this.b += c.b; return this; }
    multiply(c) { this.r *= c.r; this.g *= c.g; this.b *= c.b; return this; }
    multiplyScalar(s) { this.r *= s; this.g *= s; this.b *= s; return this; }
    lerp(c, alpha) { this.r += (c.r - this.r) * alpha; this.g += (c.g - this.g) * alpha; this.b += (c.b - this.b) * alpha; return this; }
    fromArray(a, offset) { var i = faoxomValue(offset, 0); this.r = a[i]; this.g = a[i + 1]; this.b = a[i + 2]; return this; }
    toArray(a, offset) { var out = a || []; var i = faoxomValue(offset, 0); out[i] = this.r; out[i + 1] = this.g; out[i + 2] = this.b; return out; }
    getHex() { return ((this.r * 255) << 16) ^ ((this.g * 255) << 8) ^ ((this.b * 255) << 0); }
    getHexString() { return ("000000" + this.getHex().toString(16)).slice(-6); }
}

class Object3D {
    constructor() { this.id = faoxomIdNext(); this.uuid = String(this.id); this.name = ""; this.type = "Object3D"; this.parent = null; this.children = []; this.position = new Vector3(); this.rotation = new Euler(0, 0, 0, "YXZ"); this.quaternion = new Quaternion(); this.scale = new Vector3(1, 1, 1); this.matrix = new Matrix4(); this.matrixWorld = new Matrix4(); this.matrixWorldNeedsUpdate = true; this.matrixAutoUpdate = true; this.visible = true; this.castShadow = false; this.receiveShadow = false; this.renderOrder = 0; this.userData = {}; this._rotationSnapshot = { x: 0, y: 0, z: 0, order: "YXZ" }; var self = this; this.rotation.onChange = function() { self.quaternion.setFromEuler(self.rotation); self._rotationSnapshot.x = self.rotation.x; self._rotationSnapshot.y = self.rotation.y; self._rotationSnapshot.z = self.rotation.z; self._rotationSnapshot.order = self.rotation.order; self.matrixWorldNeedsUpdate = true; }; this.quaternion.onChange = function() { self.matrixWorldNeedsUpdate = true; }; }
    setRotation(x, y, z, order) { this.rotation.set(x, y, z, order); return this; }
    add() { for (var i = 0; i < arguments.length; i++) { var object = arguments[i]; if (!object || object === this) continue; if (object.parent) object.parent.remove(object); object.parent = this; this.children.push(object); } return this; }
    remove() { for (var i = 0; i < arguments.length; i++) { var object = arguments[i]; var index = this.children.indexOf(object); if (index !== -1) { object.parent = null; this.children.splice(index, 1); } } return this; }
    attach(object) { if (object.parent) object.parent.remove(object); var inv = this.matrixWorld.clone().invert(); object.applyMatrix4(inv); this.add(object); return this; }
    applyMatrix4(m) { this.matrix.premultiply(m); this.matrix.decompose(this.position, this.quaternion, this.scale); this.rotation.setFromQuaternion(this.quaternion, this.rotation.order); return this; }
    updateMatrix() { if (this.rotation.x !== this._rotationSnapshot.x || this.rotation.y !== this._rotationSnapshot.y || this.rotation.z !== this._rotationSnapshot.z || this.rotation.order !== this._rotationSnapshot.order) { this.quaternion.setFromEuler(this.rotation); this._rotationSnapshot.x = this.rotation.x; this._rotationSnapshot.y = this.rotation.y; this._rotationSnapshot.z = this.rotation.z; this._rotationSnapshot.order = this.rotation.order; } this.matrix.compose(this.position, this.quaternion, this.scale); this.matrixWorldNeedsUpdate = true; return this; }
    updateMatrixWorld(force) { if (this.matrixAutoUpdate) this.updateMatrix(); if (this.matrixWorldNeedsUpdate || force) { if (this.parent) this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix); else this.matrixWorld.copy(this.matrix); this.matrixWorldNeedsUpdate = false; force = true; } for (var i = 0; i < this.children.length; i++) this.children[i].updateMatrixWorld(force); return this; }
    traverse(callback) { callback(this); for (var i = 0; i < this.children.length; i++) this.children[i].traverse(callback); }
    traverseVisible(callback) { if (!this.visible) return; callback(this); for (var i = 0; i < this.children.length; i++) this.children[i].traverseVisible(callback); }
    getObjectById(id) { if (this.id === id) return this; for (var i = 0; i < this.children.length; i++) { var found = this.children[i].getObjectById(id); if (found) return found; } return undefined; }
    getObjectByName(name) { if (this.name === name) return this; for (var i = 0; i < this.children.length; i++) { var found = this.children[i].getObjectByName(name); if (found) return found; } return undefined; }
    clone(recursive) { var object = new Object3D(); object.name = this.name; object.position.copy(this.position); object.quaternion.copy(this.quaternion); object.scale.copy(this.scale); object.visible = this.visible; object.userData = JSON.parse(JSON.stringify(this.userData || {})); if (recursive !== false) for (var i = 0; i < this.children.length; i++) object.add(this.children[i].clone(true)); return object; }
    destroy() { while (this.children.length) this.children.pop().destroy(); if (this.parent) this.parent.remove(this); this.userData = {}; }
}

class Node extends Object3D { constructor() { super(); this.type = "Node"; } clone(recursive) { var n = new Node(); n.name = this.name; n.position.copy(this.position); n.quaternion.copy(this.quaternion); n.scale.copy(this.scale); if (recursive !== false) for (var i = 0; i < this.children.length; i++) n.add(this.children[i].clone(true)); return n; } }
class Group extends Node { constructor() { super(); this.type = "Group"; } }
class Scene extends Node { constructor() { super(); this.type = "Scene"; this.background = null; this.fog = null; this.environment = null; this.autoUpdate = true; } }

class Geometry {
    constructor() { this.id = faoxomIdNext(); this.refCount = 0; this.attributes = {}; this.index = null; this.boundingBox = null; this.boundingSphere = null; this.disposed = false; this.groups = []; }
    setAttribute(name, attribute, itemSize, normalized) { if (attribute && attribute.array) this.attributes[name] = attribute; else this.attributes[name] = { array: faoxomArray(attribute), itemSize: itemSize || 3, normalized: !!normalized }; return this; }
    getAttribute(name) { return this.attributes[name]; }
    deleteAttribute(name) { delete this.attributes[name]; return this; }
    setIndex(index) { this.index = index && index.array ? index.array : index; return this; }
    addGroup(start, count, materialIndex) { this.groups.push({ start: start, count: count, materialIndex: materialIndex || 0 }); return this; }
    computeVertexNormals() { var pos = this.attributes.position; if (!pos) return this; var p = pos.array; var n = new Float32Array(p.length); var idx = this.index; var count = idx ? idx.length : p.length / 3; var add = function(a, b, c) { var ax = p[a * 3], ay = p[a * 3 + 1], az = p[a * 3 + 2]; var bx = p[b * 3], by = p[b * 3 + 1], bz = p[b * 3 + 2]; var cx = p[c * 3], cy = p[c * 3 + 1], cz = p[c * 3 + 2]; var abx = bx - ax, aby = by - ay, abz = bz - az; var acx = cx - ax, acy = cy - ay, acz = cz - az; var nx = aby * acz - abz * acy; var ny = abz * acx - abx * acz; var nz = abx * acy - aby * acx; n[a * 3] += nx; n[a * 3 + 1] += ny; n[a * 3 + 2] += nz; n[b * 3] += nx; n[b * 3 + 1] += ny; n[b * 3 + 2] += nz; n[c * 3] += nx; n[c * 3 + 1] += ny; n[c * 3 + 2] += nz; }; for (var i = 0; i < count; i += 3) add(idx ? idx[i] : i, idx ? idx[i + 1] : i + 1, idx ? idx[i + 2] : i + 2); for (var j = 0; j < n.length; j += 3) { var l = Math.sqrt(n[j] * n[j] + n[j + 1] * n[j + 1] + n[j + 2] * n[j + 2]) || 1; n[j] /= l; n[j + 1] /= l; n[j + 2] /= l; } this.attributes.normal = { array: n, itemSize: 3, normalized: false }; return this; }
    computeTangents() { var pos = this.attributes.position; var uv = this.attributes.uv; var normal = this.attributes.normal; if (!pos || !uv || !normal) return this; var count = pos.array.length / 3; var tangent = new Float32Array(count * 4); for (var i = 0; i < count; i++) tangent[i * 4] = 1; this.attributes.tangent = { array: tangent, itemSize: 4, normalized: false }; return this; }
    computeBoundingBox() { var a = this.attributes.position; if (!a) return this; var box = new Box3(); for (var i = 0; i < a.array.length; i += a.itemSize) box.expandByPoint(new Vector3(a.array[i], a.array[i + 1], a.array[i + 2])); this.boundingBox = box; return this; }
    computeBoundingSphere() { if (!this.boundingBox) this.computeBoundingBox(); var center = this.boundingBox.getCenter(new Vector3()); var max = 0; var a = this.attributes.position; for (var i = 0; i < a.array.length; i += a.itemSize) max = Math.max(max, center.distanceToSquared(new Vector3(a.array[i], a.array[i + 1], a.array[i + 2]))); this.boundingSphere = new Sphere(center, Math.sqrt(max)); return this; }
    clone() { var g = new Geometry(); for (var name in this.attributes) { var a = this.attributes[name]; g.attributes[name] = { array: new a.array.constructor(a.array), itemSize: a.itemSize, normalized: a.normalized }; } g.index = this.index ? new this.index.constructor(this.index) : null; g.groups = this.groups.map(function(x) { return { start: x.start, count: x.count, materialIndex: x.materialIndex }; }); return g; }
    dispose() { this.disposed = true; this.attributes = {}; this.index = null; }
}

function faoxomGeometry(positions, normals, uvs, indices) { var g = new Geometry(); g.setAttribute("position", new Float32Array(positions), 3); if (normals) g.setAttribute("normal", new Float32Array(normals), 3); if (uvs) g.setAttribute("uv", new Float32Array(uvs), 2); if (indices) g.setIndex(indices.length > 65535 ? new Uint32Array(indices) : new Uint16Array(indices)); if (!normals) g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); return g; }

class BoxGeometry extends Geometry {
    constructor(width, height, depth, sx, sy, sz) { super(); width = faoxomValue(width, 1); height = faoxomValue(height, 1); depth = faoxomValue(depth, 1); sx = Math.max(1, Math.floor(faoxomValue(sx, 1))); sy = Math.max(1, Math.floor(faoxomValue(sy, 1))); sz = Math.max(1, Math.floor(faoxomValue(sz, 1))); var p = [], n = [], u = [], ind = [], addFace = function(axis, sign, w, h, segmentsW, segmentsH) { var base = p.length / 3; for (var iy = 0; iy <= segmentsH; iy++) for (var ix = 0; ix <= segmentsW; ix++) { var a = ix / segmentsW - 0.5; var b = iy / segmentsH - 0.5; var x = 0, y = 0, z = 0; if (axis === "x") { x = sign * w / 2; y = a * h; z = b * (axis === "x" ? depth : w); } else if (axis === "y") { x = a * w; y = sign * h / 2; z = b * depth; } else { x = a * w; y = b * h; z = sign * depth / 2; } p.push(x, y, z); n.push(axis === "x" ? sign : 0, axis === "y" ? sign : 0, axis === "z" ? sign : 0); u.push(ix / segmentsW, 1 - iy / segmentsH); } for (var iy2 = 0; iy2 < segmentsH; iy2++) for (var ix2 = 0; ix2 < segmentsW; ix2++) { var a0 = base + iy2 * (segmentsW + 1) + ix2; var a1 = a0 + 1; var b0 = a0 + segmentsW + 1; var b1 = b0 + 1; var winding = axis === "y" ? -sign : sign; if (winding > 0) ind.push(a0, a1, b1, a0, b1, b0); else ind.push(a0, b1, a1, a0, b0, b1); } }; addFace("x", 1, depth, height, sz, sy); addFace("x", -1, depth, height, sz, sy); addFace("y", 1, width, depth, sx, sz); addFace("y", -1, width, depth, sx, sz); addFace("z", 1, width, height, sx, sy); addFace("z", -1, width, height, sx, sy); this.attributes = faoxomGeometry(p, n, u, ind).attributes; this.index = faoxomGeometry(p, n, u, ind).index; this.computeBoundingBox(); this.computeBoundingSphere(); }
}

class PlaneGeometry extends Geometry {
    constructor(width, height, sx, sy) { super(); width = faoxomValue(width, 1); height = faoxomValue(height, 1); sx = Math.max(1, Math.floor(faoxomValue(sx, 1))); sy = Math.max(1, Math.floor(faoxomValue(sy, 1))); var p = [], n = [], u = [], ind = []; for (var iy = 0; iy <= sy; iy++) for (var ix = 0; ix <= sx; ix++) { p.push((ix / sx - 0.5) * width, (iy / sy - 0.5) * height, 0); n.push(0, 0, 1); u.push(ix / sx, iy / sy); } for (var y = 0; y < sy; y++) for (var x = 0; x < sx; x++) { var a = y * (sx + 1) + x; var b = a + 1; var c = a + sx + 1; var d = c + 1; ind.push(a, b, d, a, d, c); } this.attributes = faoxomGeometry(p, n, u, ind).attributes; this.index = new Uint16Array(ind); this.computeBoundingBox(); this.computeBoundingSphere(); }
}

class SphereGeometry extends Geometry {
    constructor(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength) { super(); radius = faoxomValue(radius, 1); widthSegments = Math.max(3, Math.floor(faoxomValue(widthSegments, 24))); heightSegments = Math.max(2, Math.floor(faoxomValue(heightSegments, 16))); phiStart = faoxomValue(phiStart, 0); phiLength = faoxomValue(phiLength, Math.PI * 2); thetaStart = faoxomValue(thetaStart, 0); thetaLength = faoxomValue(thetaLength, Math.PI); var p = [], n = [], u = [], ind = []; for (var y = 0; y <= heightSegments; y++) { var v = y / heightSegments; var theta = thetaStart + v * thetaLength; for (var x = 0; x <= widthSegments; x++) { var uu = x / widthSegments; var phi = phiStart + uu * phiLength; var sx = -radius * Math.cos(phi) * Math.sin(theta); var sy = radius * Math.cos(theta); var sz = radius * Math.sin(phi) * Math.sin(theta); p.push(sx, sy, sz); n.push(sx / radius, sy / radius, sz / radius); u.push(uu, 1 - v); } } for (var iy = 0; iy < heightSegments; iy++) for (var ix = 0; ix < widthSegments; ix++) { var a = iy * (widthSegments + 1) + ix; var b = a + widthSegments + 1; var c = b + 1; var d = a + 1; if (iy !== 0) ind.push(a, b, d); if (iy !== heightSegments - 1) ind.push(b, c, d); } this.attributes = faoxomGeometry(p, n, u, ind).attributes; this.index = ind.length > 65535 ? new Uint32Array(ind) : new Uint16Array(ind); this.computeBoundingBox(); this.computeBoundingSphere(); }
}

class CylinderGeometry extends Geometry {
    constructor(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded) { super(); radiusTop = faoxomValue(radiusTop, 1); radiusBottom = faoxomValue(radiusBottom, radiusTop); height = faoxomValue(height, 1); radialSegments = Math.max(3, Math.floor(faoxomValue(radialSegments, 16))); heightSegments = Math.max(1, Math.floor(faoxomValue(heightSegments, 1))); openEnded = !!openEnded; var p = [], n = [], u = [], ind = []; for (var y = 0; y <= heightSegments; y++) { var v = y / heightSegments; var r = radiusBottom + (radiusTop - radiusBottom) * v; for (var x = 0; x <= radialSegments; x++) { var a = x / radialSegments * Math.PI * 2; p.push(r * Math.cos(a), v * height - height / 2, r * Math.sin(a)); var slope = (radiusBottom - radiusTop) / height; var nn = new Vector3(Math.cos(a), slope, Math.sin(a)).normalize(); n.push(nn.x, nn.y, nn.z); u.push(x / radialSegments, v); } } for (var yy = 0; yy < heightSegments; yy++) for (var xx = 0; xx < radialSegments; xx++) { var aa = yy * (radialSegments + 1) + xx; var bb = aa + radialSegments + 1; ind.push(aa, bb, aa + 1, bb, bb + 1, aa + 1); } if (!openEnded && radiusTop > 0) { var top = p.length / 3; p.push(0, height / 2, 0); n.push(0, 1, 0); u.push(0.5, 0.5); for (var tx = 0; tx < radialSegments; tx++) ind.push(top, (heightSegments * (radialSegments + 1)) + tx + 1, (heightSegments * (radialSegments + 1)) + tx); } if (!openEnded && radiusBottom > 0) { var bot = p.length / 3; p.push(0, -height / 2, 0); n.push(0, -1, 0); u.push(0.5, 0.5); for (var bx = 0; bx < radialSegments; bx++) ind.push(bot, bx, bx + 1); } this.attributes = faoxomGeometry(p, n, u, ind).attributes; this.index = ind.length > 65535 ? new Uint32Array(ind) : new Uint16Array(ind); this.computeBoundingBox(); this.computeBoundingSphere(); }
}

class ConeGeometry extends CylinderGeometry { constructor(radius, height, radialSegments, heightSegments, openEnded) { super(0, radius, height, radialSegments, heightSegments, openEnded); } }

class TorusGeometry extends Geometry {
    constructor(radius, tube, radialSegments, tubularSegments, arc) { super(); radius = faoxomValue(radius, 1); tube = faoxomValue(tube, 0.4); radialSegments = Math.max(3, Math.floor(faoxomValue(radialSegments, 12))); tubularSegments = Math.max(3, Math.floor(faoxomValue(tubularSegments, 24))); arc = faoxomValue(arc, Math.PI * 2); var p = [], n = [], u = [], ind = []; for (var j = 0; j <= radialSegments; j++) for (var i = 0; i <= tubularSegments; i++) { var uu = i / tubularSegments * arc; var vv = j / radialSegments * Math.PI * 2; var cx = radius * Math.cos(uu); var cy = radius * Math.sin(uu); var nx = Math.cos(uu) * Math.cos(vv); var ny = Math.sin(uu) * Math.cos(vv); var nz = Math.sin(vv); p.push(cx + tube * nx, tube * nz, cy + tube * ny); n.push(nx, nz, ny); u.push(i / tubularSegments, j / radialSegments); } for (var y = 1; y <= radialSegments; y++) for (var x = 1; x <= tubularSegments; x++) { var a = (tubularSegments + 1) * (y - 1) + x - 1; var b = (tubularSegments + 1) * y + x - 1; var c = (tubularSegments + 1) * y + x; var d = (tubularSegments + 1) * (y - 1) + x; ind.push(a, b, d, b, c, d); } this.attributes = faoxomGeometry(p, n, u, ind).attributes; this.index = ind.length > 65535 ? new Uint32Array(ind) : new Uint16Array(ind); this.computeBoundingBox(); this.computeBoundingSphere(); }
}

class TorusKnotGeometry extends TorusGeometry { constructor(radius, tube, tubularSegments, radialSegments, p, q) { super(radius, tube, radialSegments, tubularSegments); p = faoxomValue(p, 2); q = faoxomValue(q, 3); var base = new TorusGeometry(radius, tube, radialSegments, tubularSegments); this.attributes = base.attributes; this.index = base.index; this.computeBoundingBox(); this.computeBoundingSphere(); } }
class IcosahedronGeometry extends SphereGeometry { constructor(radius, detail) { super(radius, Math.max(3, 10 * (faoxomValue(detail, 0) + 1)), Math.max(2, 6 * (faoxomValue(detail, 0) + 1))); } }
class DodecahedronGeometry extends SphereGeometry { constructor(radius, detail) { super(radius, Math.max(3, 12 * (faoxomValue(detail, 0) + 1)), Math.max(2, 8 * (faoxomValue(detail, 0) + 1))); } }
class OctahedronGeometry extends SphereGeometry { constructor(radius, detail) { super(radius, Math.max(3, 8 * (faoxomValue(detail, 0) + 1)), Math.max(2, 4 * (faoxomValue(detail, 0) + 1))); } }
class TetrahedronGeometry extends SphereGeometry { constructor(radius, detail) { super(radius, Math.max(3, 6 * (faoxomValue(detail, 0) + 1)), Math.max(2, 4 * (faoxomValue(detail, 0) + 1))); } }

class RingGeometry extends Geometry {
    constructor(innerRadius, outerRadius, thetaSegments, phiSegments, thetaStart, thetaLength) { super(); innerRadius = faoxomValue(innerRadius, 0.25); outerRadius = faoxomValue(outerRadius, 0.5); thetaSegments = Math.max(3, Math.floor(faoxomValue(thetaSegments, 16))); phiSegments = Math.max(1, Math.floor(faoxomValue(phiSegments, 1))); thetaStart = faoxomValue(thetaStart, 0); thetaLength = faoxomValue(thetaLength, Math.PI * 2); var p = [], n = [], u = [], ind = []; for (var y = 0; y <= phiSegments; y++) for (var x = 0; x <= thetaSegments; x++) { var r = innerRadius + (outerRadius - innerRadius) * y / phiSegments; var a = thetaStart + thetaLength * x / thetaSegments; p.push(r * Math.cos(a), r * Math.sin(a), 0); n.push(0, 0, 1); u.push(x / thetaSegments, y / phiSegments); } for (var yy = 0; yy < phiSegments; yy++) for (var xx = 0; xx < thetaSegments; xx++) { var a0 = yy * (thetaSegments + 1) + xx; var a1 = a0 + 1; var b0 = a0 + thetaSegments + 1; var b1 = b0 + 1; ind.push(a0, b0, a1, a1, b0, b1); } this.attributes = faoxomGeometry(p, n, u, ind).attributes; this.index = new Uint16Array(ind); this.computeBoundingBox(); this.computeBoundingSphere(); }
}

class LatheGeometry extends Geometry {
    constructor(points, segments, phiStart, phiLength) { super(); points = points || [new Vector2(0, -0.5), new Vector2(0.5, 0.5)]; segments = Math.max(3, Math.floor(faoxomValue(segments, 12))); phiStart = faoxomValue(phiStart, 0); phiLength = faoxomValue(phiLength, Math.PI * 2); var p = [], n = [], u = [], ind = []; for (var y = 0; y < points.length; y++) for (var x = 0; x <= segments; x++) { var a = phiStart + phiLength * x / segments; var r = points[y].x; p.push(r * Math.cos(a), points[y].y, r * Math.sin(a)); n.push(Math.cos(a), 0, Math.sin(a)); u.push(x / segments, y / (points.length - 1)); } for (var py = 0; py < points.length - 1; py++) for (var px = 0; px < segments; px++) { var a0 = py * (segments + 1) + px; var a1 = a0 + 1; var b0 = a0 + segments + 1; var b1 = b0 + 1; ind.push(a0, b0, a1, a1, b0, b1); } this.attributes = faoxomGeometry(p, n, u, ind).attributes; this.index = new Uint16Array(ind); this.computeBoundingBox(); this.computeBoundingSphere(); }
}

class Shape {
    constructor(points) { this.points = points || []; this.holes = []; }
    moveTo(x, y) { this.points.push(new Vector2(x, y)); return this; }
    lineTo(x, y) { this.points.push(new Vector2(x, y)); return this; }
    closePath() { return this; }
}
class ExtrudeGeometry extends Geometry {
    constructor(shape, depth, bevelEnabled, bevelSize) { super(); var pts = shape && shape.points ? shape.points : shape || []; depth = faoxomValue(depth, 1); bevelEnabled = !!bevelEnabled; bevelSize = faoxomValue(bevelSize, 0.1); if (pts.length < 3) pts = [new Vector2(-0.5, -0.5), new Vector2(0.5, -0.5), new Vector2(0.5, 0.5), new Vector2(-0.5, 0.5)]; var p = [], n = [], u = [], ind = []; for (var side = 0; side < 2; side++) for (var i = 0; i < pts.length; i++) { p.push(pts[i].x, pts[i].y, side ? depth / 2 : -depth / 2); n.push(0, 0, side ? 1 : -1); u.push((pts[i].x + 1) / 2, (pts[i].y + 1) / 2); } var len = pts.length; for (var i2 = 1; i2 < len - 1; i2++) { ind.push(0, i2 + 1, i2); ind.push(len, len + i2, len + i2 + 1); } for (var j = 0; j < len; j++) { var k = (j + 1) % len; ind.push(j, len + j, k, k, len + j, len + k); } this.attributes = faoxomGeometry(p, n, u, ind).attributes; this.index = new Uint16Array(ind); this.computeBoundingBox(); this.computeBoundingSphere(); }
}

class Texture {
    constructor(source, options) { options = options || {}; this.id = faoxomIdNext(); this.source = source || null; this.image = null; this.loaded = false; this.error = null; this.wrapS = faoxomValue(options.wrapS, "repeat"); this.wrapT = faoxomValue(options.wrapT, "repeat"); this.minFilter = faoxomValue(options.minFilter, "linearMipmapLinear"); this.magFilter = faoxomValue(options.magFilter, "linear"); this.format = faoxomValue(options.format, "rgba"); this.type = faoxomValue(options.type, "unsignedByte"); this.anisotropy = faoxomValue(options.anisotropy, 1); this.flipY = options.flipY !== false; this.needsUpdate = true; this.promise = null; if (source && typeof source === "string") this.load(source); else if (source) { this.image = source; this.loaded = true; } }
    load(url) { var self = this; if (typeof Image === "undefined") { this.promise = Promise.resolve(this); return this.promise; } this.promise = new Promise(function(resolve, reject) { var image = new Image(); image.onload = function() { self.image = image; self.loaded = true; self.needsUpdate = true; resolve(self); }; image.onerror = function(error) { self.error = error; reject(error); }; image.src = url; }); return this.promise; }
    clone() { var t = new Texture(this.image || this.source, { wrapS: this.wrapS, wrapT: this.wrapT, minFilter: this.minFilter, magFilter: this.magFilter, format: this.format, type: this.type, anisotropy: this.anisotropy, flipY: this.flipY }); return t; }
    dispose() { this.image = null; this.source = null; this.needsUpdate = false; }
}
class CubeTexture extends Texture { constructor(sources, options) { super(null, options); this.sources = sources || []; this.images = []; this.loaded = false; this.promise = this.loadCube(this.sources); } loadCube(sources) { var self = this; if (typeof Image === "undefined" || !sources || !sources.length) return Promise.resolve(this); return Promise.all(sources.map(function(url) { return new Promise(function(resolve, reject) { var image = new Image(); image.onload = function() { resolve(image); }; image.onerror = reject; image.src = url; }); })).then(function(images) { self.images = images; self.loaded = true; self.needsUpdate = true; return self; }); } }

class Material {
    constructor(options) { options = options || {}; this.id = faoxomIdNext(); this.refCount = 0; this.type = "Material"; this.color = new Color(faoxomValue(options.color, 0xffffff)); this.ambient = new Color(faoxomValue(options.ambient, 0x222222)); this.diffuse = new Color(faoxomValue(options.diffuse, this.color)); this.specular = new Color(faoxomValue(options.specular, 0x111111)); this.emissive = new Color(faoxomValue(options.emissive, 0)); this.shininess = faoxomValue(options.shininess, 30); this.opacity = faoxomValue(options.opacity, 1); this.transparent = !!options.transparent || this.opacity < 1; this.side = faoxomValue(options.side, "front"); this.depthTest = options.depthTest !== false; this.depthWrite = options.depthWrite !== false; this.blendMode = faoxomValue(options.blendMode, "normal"); this.wireframe = !!options.wireframe; this.renderOrder = faoxomValue(options.renderOrder, 0); this.diffuseMap = options.diffuseMap || options.map || null; this.normalMap = options.normalMap || null; this.specularMap = options.specularMap || null; this.emissiveMap = options.emissiveMap || null; this.aoMap = options.aoMap || null; this.alphaMap = options.alphaMap || null; this.envMap = options.envMap || null; this.needsUpdate = true; }
    clone() { return new this.constructor({ color: this.color.clone(), ambient: this.ambient.clone(), diffuse: this.diffuse.clone(), specular: this.specular.clone(), emissive: this.emissive.clone(), shininess: this.shininess, opacity: this.opacity, transparent: this.transparent, side: this.side, depthTest: this.depthTest, depthWrite: this.depthWrite, blendMode: this.blendMode, wireframe: this.wireframe, renderOrder: this.renderOrder, diffuseMap: this.diffuseMap, normalMap: this.normalMap, specularMap: this.specularMap, emissiveMap: this.emissiveMap, aoMap: this.aoMap, alphaMap: this.alphaMap, envMap: this.envMap }); }
    dispose() { this.diffuseMap = null; this.normalMap = null; this.specularMap = null; this.emissiveMap = null; this.aoMap = null; this.alphaMap = null; this.envMap = null; this.needsUpdate = false; }
}
class StandardMaterial extends Material { constructor(options) { super(options); this.type = "StandardMaterial"; this.metalness = faoxomValue(options && options.metalness, 0); this.roughness = faoxomValue(options && options.roughness, 0.5); } }
class PhongMaterial extends Material { constructor(options) { super(options); this.type = "PhongMaterial"; } }
class LambertMaterial extends Material { constructor(options) { super(options); this.type = "LambertMaterial"; } }
class BasicMaterial extends Material { constructor(options) { super(options); this.type = "BasicMaterial"; } }

class Mesh extends Object3D {
    constructor(geometry, material) { super(); this.type = "Mesh"; this.geometry = geometry || new Geometry(); this.material = material || new StandardMaterial(); this.geometry.refCount = (this.geometry.refCount || 0) + 1; if (this.material) this.material.refCount = (this.material.refCount || 0) + 1; this.frustumCulled = true; this.skeleton = null; }
    clone(recursive) { var m = new Mesh(this.geometry, this.material); m.name = this.name; m.position.copy(this.position); m.quaternion.copy(this.quaternion); m.scale.copy(this.scale); m.visible = this.visible; if (recursive !== false) for (var i = 0; i < this.children.length; i++) m.add(this.children[i].clone(true)); return m; }
    destroy() { if (this.geometry) { this.geometry.refCount = Math.max(0, (this.geometry.refCount || 1) - 1); if (!this.geometry.refCount && this.geometry.dispose) this.geometry.dispose(); } if (this.material) { this.material.refCount = Math.max(0, (this.material.refCount || 1) - 1); if (!this.material.refCount && this.material.dispose) this.material.dispose(); } super.destroy(); }
}

class Light extends Object3D { constructor(color, intensity) { super(); this.type = "Light"; this.color = new Color(faoxomValue(color, 0xffffff)); this.intensity = faoxomValue(intensity, 1); this.castShadow = false; } }
class AmbientLight extends Light { constructor(color, intensity) { super(color, intensity); this.type = "AmbientLight"; } }
class DirectionalLight extends Light { constructor(color, intensity) { super(color, intensity); this.type = "DirectionalLight"; this.shadow = { enabled: false, mapSize: 1024, camera: new OrthographicCamera(-10, 10, 10, -10, 0.1, 100), bias: 0.0005, map: null }; } }
class PointLight extends Light { constructor(color, intensity, distance, decay) { super(color, intensity); this.type = "PointLight"; this.distance = faoxomValue(distance, 0); this.decay = faoxomValue(decay, 2); } }
class SpotLight extends Light { constructor(color, intensity, distance, angle, penumbra, decay) { super(color, intensity); this.type = "SpotLight"; this.distance = faoxomValue(distance, 0); this.angle = faoxomValue(angle, Math.PI / 3); this.penumbra = faoxomValue(penumbra, 0); this.decay = faoxomValue(decay, 2); this.target = new Object3D(); this.shadow = { enabled: false, mapSize: 1024, camera: new PerspectiveCamera(50, 1, 0.1, 100), bias: 0.0005, map: null }; } }
class HemisphereLight extends Light { constructor(skyColor, groundColor, intensity) { super(skyColor, intensity); this.type = "HemisphereLight"; this.groundColor = new Color(faoxomValue(groundColor, 0x444444)); } }
class RectAreaLight extends Light { constructor(color, intensity, width, height) { super(color, intensity); this.type = "RectAreaLight"; this.width = faoxomValue(width, 1); this.height = faoxomValue(height, 1); } }

class Camera extends Object3D {
    constructor() { super(); this.type = "Camera"; this.matrixWorldInverse = new Matrix4(); this.projectionMatrix = new Matrix4(); this.up = new Vector3(0, 1, 0); }
    updateMatrixWorld(force) { super.updateMatrixWorld(force); this.matrixWorldInverse.copy(this.matrixWorld).invert(); return this; }
    lookAt(target) { var z = new Vector3().subVectors(this.position, target).normalize(); var x = new Vector3().crossVectors(this.up, z).normalize(); var y = new Vector3().crossVectors(z, x); var m = new Matrix4().set(x.x, y.x, z.x, 0, x.y, y.y, z.y, 0, x.z, y.z, z.z, 0, 0, 0, 0, 1); this.quaternion.setFromRotationMatrix(m); this.rotation.setFromQuaternion(this.quaternion, this.rotation.order); return this; }
    getWorldDirection(target) { var t = target || new Vector3(); this.updateMatrixWorld(true); return t.set(0, 0, -1).transformDirection(this.matrixWorld); }
}
class PerspectiveCamera extends Camera {
    constructor(fov, aspect, near, far) { super(); this.type = "PerspectiveCamera"; this.fov = faoxomValue(fov, 50); this.aspect = faoxomValue(aspect, 1); this.near = faoxomValue(near, 0.1); this.far = faoxomValue(far, 2000); this.updateProjectionMatrix(); }
    updateProjectionMatrix() { this.projectionMatrix.makePerspective(this.fov, this.aspect, this.near, this.far); return this; }
}
class OrthographicCamera extends Camera {
    constructor(left, right, top, bottom, near, far) { super(); this.type = "OrthographicCamera"; this.left = faoxomValue(left, -1); this.right = faoxomValue(right, 1); this.top = faoxomValue(top, 1); this.bottom = faoxomValue(bottom, -1); this.near = faoxomValue(near, 0.1); this.far = faoxomValue(far, 2000); this.updateProjectionMatrix(); }
    updateProjectionMatrix() { this.projectionMatrix.makeOrthographic(this.left, this.right, this.top, this.bottom, this.near, this.far); return this; }
}

class Skeleton {
    constructor(bones, inverses) { this.bones = bones || []; this.boneInverses = inverses || []; this.boneMatrices = new Float32Array(this.bones.length * 16); this.boneTexture = null; this.boneTextureSize = 0; this.calculateInverses(); }
    calculateInverses() { if (!this.boneInverses.length) for (var i = 0; i < this.bones.length; i++) this.boneInverses.push(this.bones[i].matrixWorld.clone().invert()); return this; }
    pose() { for (var i = 0; i < this.bones.length; i++) { var bone = this.bones[i]; bone.matrixWorld.copy(this.boneInverses[i]).invert(); if (bone.parent) bone.matrixWorld.premultiply(bone.parent.matrixWorld); } return this; }
    update() { for (var i = 0; i < this.bones.length; i++) { var m = new Matrix4().multiplyMatrices(this.bones[i].matrixWorld, this.boneInverses[i]); m.toArray(this.boneMatrices, i * 16); } return this; }
    getBoneByName(name) { for (var i = 0; i < this.bones.length; i++) if (this.bones[i].name === name) return this.bones[i]; return undefined; }
}
class Bone extends Object3D { constructor() { super(); this.type = "Bone"; } }
class SkinnedMesh extends Mesh {
    constructor(geometry, material) { super(geometry, material); this.type = "SkinnedMesh"; this.bindMode = "attached"; this.bindMatrix = new Matrix4(); this.bindMatrixInverse = new Matrix4(); this.skeleton = null; }
    bind(skeleton, bindMatrix) { this.skeleton = skeleton; this.bindMatrix.copy(bindMatrix || this.matrixWorld); this.bindMatrixInverse.copy(this.bindMatrix).invert(); skeleton.update(); return this; }
    normalizeSkinWeights() { var skin = this.geometry.getAttribute("skinWeight"); if (!skin) return this; for (var i = 0; i < skin.array.length; i += 4) { var sum = skin.array[i] + skin.array[i + 1] + skin.array[i + 2] + skin.array[i + 3] || 1; skin.array[i] /= sum; skin.array[i + 1] /= sum; skin.array[i + 2] /= sum; skin.array[i + 3] /= sum; } return this; }
}

class AnimationTrack {
    constructor(name, times, values, type, interpolation) { this.name = name || ""; this.times = faoxomArray(times); this.values = values || []; this.valueType = type || "number"; this.interpolation = interpolation || "linear"; this.valueSize = this.valueType === "number" ? 1 : this.valueType === "quaternion" ? 4 : this.valueType === "color" ? 3 : this.valueType === "vector2" ? 2 : this.valueType === "vector4" ? 4 : 3; }
    getValue(index, target) { var start = index * this.valueSize; var value; if (this.valueType === "number") return this.values[start] === undefined ? this.values[index] : this.values[start]; if (this.valueType === "vector3") value = target || new Vector3(); else if (this.valueType === "vector2") value = target || new Vector2(); else if (this.valueType === "vector4") value = target || new Vector4(); else if (this.valueType === "quaternion") value = target || new Quaternion(); else if (this.valueType === "color") value = target || new Color(); else value = target || new Vector3(); if (value.fromArray) value.fromArray(this.values, start); return value; }
    sample(time, target) { var count = this.times.length; if (!count) return target; if (time <= this.times[0]) return this.getValue(0, target); if (time >= this.times[count - 1]) return this.getValue(count - 1, target); var i = 0; while (i < count - 1 && time >= this.times[i + 1]) i++; var t = (time - this.times[i]) / (this.times[i + 1] - this.times[i]); var a = this.getValue(i); var b = this.getValue(i + 1); if (this.interpolation === "step") return a; if (this.valueType === "number") return a + (b - a) * t; if (this.valueType === "quaternion") return a.slerp(b, t); return a.lerp(b, t); }
}
class AnimationClip { constructor(name, duration, tracks) { this.name = name || "clip"; this.tracks = tracks || []; this.duration = duration === undefined ? this.computeDuration() : duration; } computeDuration() { var d = 0; for (var i = 0; i < this.tracks.length; i++) if (this.tracks[i].times.length) d = Math.max(d, this.tracks[i].times[this.tracks[i].times.length - 1]); this.duration = d; return d; } }
function faoxomResolve(target, path) { var parts = path.split("."); var object = target; for (var i = 0; i < parts.length - 1; i++) object = object ? object[parts[i]] : null; return { object: object, key: parts[parts.length - 1] }; }
class AnimationController {
    constructor(target) { this.id = faoxomIdNext(); this.target = target; this.clips = {}; this.current = null; this.time = 0; this.speed = 1; this.weight = 1; this.loop = true; this.playing = false; this.paused = false; this.onComplete = null; this.onStart = null; }
    addClip(clip) { this.clips[clip.name] = clip; return this; }
    play(clip, reset) { var c = typeof clip === "string" ? this.clips[clip] : clip; if (!c) return this; this.current = c; if (reset !== false) this.time = 0; this.playing = true; this.paused = false; if (this.onStart) this.onStart(c, this); return this; }
    stop() { this.playing = false; this.paused = false; this.time = 0; return this; }
    pause() { this.paused = true; return this; }
    resume() { this.paused = false; this.playing = true; return this; }
    update(delta) { if (!this.playing || this.paused || !this.current) return; this.time += delta * this.speed; var clip = this.current; if (clip.duration > 0 && this.time >= clip.duration) { if (this.loop) this.time = this.time % clip.duration; else { this.time = clip.duration; this.playing = false; if (this.onComplete) this.onComplete(clip, this); } } for (var i = 0; i < clip.tracks.length; i++) { var track = clip.tracks[i]; var result = track.sample(this.time); var resolved = faoxomResolve(this.target, track.name); if (!resolved.object) continue; var current = resolved.object[resolved.key]; if (this.weight < 1 && current && current.clone && result && current.lerp) result = current.clone().lerp(result, this.weight); resolved.object[resolved.key] = result; } }
}
class AnimationManager {
    constructor() { this.controllers = []; this.speed = 1; }
    add(controller) { if (this.controllers.indexOf(controller) === -1) this.controllers.push(controller); return controller; }
    remove(controller) { var i = this.controllers.indexOf(controller); if (i !== -1) this.controllers.splice(i, 1); }
    update(delta) { for (var i = 0; i < this.controllers.length; i++) this.controllers[i].update(delta * this.speed); }
    play(target, clip, reset) { for (var i = 0; i < this.controllers.length; i++) if (this.controllers[i].target === target) this.controllers[i].play(clip, reset); }
    stop(target) { for (var i = 0; i < this.controllers.length; i++) if (!target || this.controllers[i].target === target) this.controllers[i].stop(); }
    pause(target) { for (var i = 0; i < this.controllers.length; i++) if (!target || this.controllers[i].target === target) this.controllers[i].pause(); }
    resume(target) { for (var i = 0; i < this.controllers.length; i++) if (!target || this.controllers[i].target === target) this.controllers[i].resume(); }
}

class CollisionShape {
    constructor(type, options) { this.type = type || "box"; options = options || {}; this.size = options.size ? options.size.clone() : new Vector3(faoxomValue(options.width, 1), faoxomValue(options.height, 1), faoxomValue(options.depth, 1)); this.radius = faoxomValue(options.radius, 0.5); this.height = faoxomValue(options.height, 1); this.vertices = options.vertices || null; this.boundingBox = null; this.inertia = new Vector3(); this.computeInertia(faoxomValue(options.mass, 1)); }
    computeInertia(mass) { if (this.type === "sphere") { var i = 0.4 * mass * this.radius * this.radius; this.inertia.set(i, i, i); } else { var x = this.size.x, y = this.size.y, z = this.size.z; this.inertia.set(mass * (y * y + z * z) / 12, mass * (x * x + z * z) / 12, mass * (x * x + y * y) / 12); } return this; }
    getAABB(position, target) { var b = target || new Box3(); if (this.type === "sphere") return b.set(new Vector3(position.x - this.radius, position.y - this.radius, position.z - this.radius), new Vector3(position.x + this.radius, position.y + this.radius, position.z + this.radius)); return b.set(new Vector3(position.x - this.size.x / 2, position.y - this.size.y / 2, position.z - this.size.z / 2), new Vector3(position.x + this.size.x / 2, position.y + this.size.y / 2, position.z + this.size.z / 2)); }
}
class RigidBody {
    constructor(options) { options = options || {}; this.id = faoxomIdNext(); this.object = options.object || null; this.shape = options.shape || new CollisionShape("box"); this.mass = faoxomValue(options.mass, 1); this.inverseMass = this.mass > 0 ? 1 / this.mass : 0; this.position = options.position ? options.position.clone() : this.object ? this.object.position.clone() : new Vector3(); this.rotation = options.rotation ? options.rotation.clone() : new Quaternion(); this.velocity = options.velocity ? options.velocity.clone() : new Vector3(); this.angularVelocity = new Vector3(); this.force = new Vector3(); this.restitution = faoxomValue(options.restitution, 0.2); this.friction = faoxomValue(options.friction, 0.5); this.linearDamping = faoxomValue(options.linearDamping, 0.01); this.angularDamping = faoxomValue(options.angularDamping, 0.01); this.isStatic = !!options.isStatic || this.mass === 0; this.onCollision = null; }
    applyForce(force) { if (!this.isStatic) this.force.add(force); return this; }
    applyImpulse(impulse) { if (!this.isStatic) this.velocity.addScaledVector(impulse, this.inverseMass); return this; }
    integrate(dt, gravity) { if (this.isStatic) return; this.velocity.addScaledVector(gravity, dt); this.velocity.addScaledVector(this.force, this.inverseMass * dt); this.velocity.multiplyScalar(Math.max(0, 1 - this.linearDamping * dt)); this.position.addScaledVector(this.velocity, dt); this.force.set(0, 0, 0); if (this.object) { this.object.position.copy(this.position); this.object.quaternion.copy(this.rotation); } }
}
class DistanceConstraint { constructor(a, b, distance, options) { this.a = a; this.b = b; this.distance = distance === undefined ? a.position.distanceTo(b.position) : distance; this.stiffness = faoxomValue(options && options.stiffness, 1); } solve() { var delta = new Vector3().subVectors(this.b.position, this.a.position); var length = delta.length() || 1; var error = (length - this.distance) / length * this.stiffness; var move = delta.multiplyScalar(error * 0.5); if (!this.a.isStatic) this.a.position.add(move); if (!this.b.isStatic) this.b.position.sub(move); } }
class FixedConstraint { constructor(a, b, options) { this.a = a; this.b = b; this.offset = new Vector3().subVectors(b.position, a.position); this.stiffness = faoxomValue(options && options.stiffness, 1); } solve() { if (!this.b.isStatic) this.b.position.copy(this.a.position).add(this.offset); } }
class PhysicsWorld {
    constructor(options) { options = options || {}; this.gravity = options.gravity ? options.gravity.clone() : new Vector3(0, -9.81, 0); this.fixedTimeStep = faoxomValue(options.fixedTimeStep, 1 / 60); this.accumulator = 0; this.bodies = []; this.constraints = []; this.time = 0; this.broadphase = "aabb"; this.onCollision = null; }
    addBody(body) { if (this.bodies.indexOf(body) === -1) this.bodies.push(body); return body; }
    removeBody(body) { var i = this.bodies.indexOf(body); if (i !== -1) this.bodies.splice(i, 1); }
    addConstraint(constraint) { this.constraints.push(constraint); return constraint; }
    removeConstraint(constraint) { var i = this.constraints.indexOf(constraint); if (i !== -1) this.constraints.splice(i, 1); }
    step(delta) { this.accumulator += Math.min(delta, 0.25); while (this.accumulator >= this.fixedTimeStep) { for (var i = 0; i < this.bodies.length; i++) this.bodies[i].integrate(this.fixedTimeStep, this.gravity); for (var c = 0; c < this.constraints.length; c++) this.constraints[c].solve(); this.resolveCollisions(); this.accumulator -= this.fixedTimeStep; this.time += this.fixedTimeStep; } }
    resolveCollisions() { for (var i = 0; i < this.bodies.length; i++) for (var j = i + 1; j < this.bodies.length; j++) { var a = this.bodies[i], b = this.bodies[j]; if (a.isStatic && b.isStatic) continue; var aa = a.shape.getAABB(a.position); var bb = b.shape.getAABB(b.position); if (!aa.intersectsBox(bb)) continue; var overlapX = Math.min(aa.max.x, bb.max.x) - Math.max(aa.min.x, bb.min.x); var overlapY = Math.min(aa.max.y, bb.max.y) - Math.max(aa.min.y, bb.min.y); var overlapZ = Math.min(aa.max.z, bb.max.z) - Math.max(aa.min.z, bb.min.z); var normal = new Vector3(0, 1, 0); var penetration = overlapY; if (overlapX < penetration) { penetration = overlapX; normal.set(a.position.x < b.position.x ? -1 : 1, 0, 0); } if (overlapZ < penetration) { penetration = overlapZ; normal.set(0, 0, a.position.z < b.position.z ? -1 : 1); } else if (normal.y !== 0) normal.set(0, a.position.y < b.position.y ? -1 : 1, 0); var total = a.inverseMass + b.inverseMass || 1; if (!a.isStatic) a.position.addScaledVector(normal, -penetration * (a.inverseMass / total)); if (!b.isStatic) b.position.addScaledVector(normal, penetration * (b.inverseMass / total)); var relative = new Vector3().subVectors(b.velocity, a.velocity); var speed = relative.dot(normal); if (speed < 0) { var impulse = -(1 + Math.min(a.restitution, b.restitution)) * speed / total; var impulseVector = normal.clone().multiplyScalar(impulse); a.applyImpulse(impulseVector.clone().negate()); b.applyImpulse(impulseVector); } if (a.object) a.object.position.copy(a.position); if (b.object) b.object.position.copy(b.position); if (a.onCollision) a.onCollision(b, normal, penetration); if (b.onCollision) b.onCollision(a, normal.clone().negate(), penetration); if (this.onCollision) this.onCollision(a, b, normal, penetration); } }
    raycast(ray, maxDistance) { var hits = []; var max = maxDistance === undefined ? Infinity : maxDistance; for (var i = 0; i < this.bodies.length; i++) { var body = this.bodies[i]; var box = body.shape.getAABB(body.position); var point = ray.intersectBox(box); if (point) { var distance = ray.origin.distanceTo(point); if (distance <= max) { var dx = Math.min(Math.abs(point.x - box.min.x), Math.abs(point.x - box.max.x)); var dy = Math.min(Math.abs(point.y - box.min.y), Math.abs(point.y - box.max.y)); var dz = Math.min(Math.abs(point.z - box.min.z), Math.abs(point.z - box.max.z)); var normal = new Vector3(0, 0, 0); if (dx <= dy && dx <= dz) normal.x = point.x - box.min.x < box.max.x - point.x ? -1 : 1; else if (dy <= dz) normal.y = point.y - box.min.y < box.max.y - point.y ? -1 : 1; else normal.z = point.z - box.min.z < box.max.z - point.z ? -1 : 1; hits.push({ body: body, point: point, distance: distance, normal: normal }); } } } hits.sort(function(a, b) { return a.distance - b.distance; }); return hits; }
}

class Terrain extends Mesh {
    constructor(width, depth, segmentsX, segmentsZ, options) { options = options || {}; var sx = Math.max(1, Math.floor(faoxomValue(segmentsX, 32))); var sz = Math.max(1, Math.floor(faoxomValue(segmentsZ, 32))); var g = new Geometry(); var heights = new Float32Array((sx + 1) * (sz + 1)); var p = [], n = [], u = [], ind = []; var heightScale = faoxomValue(options.heightScale, 1); var heightmap = options.heightmap || null; for (var z = 0; z <= sz; z++) for (var x = 0; x <= sx; x++) { var index = z * (sx + 1) + x; var h = heightmap ? (heightmap[index] || 0) : 0; heights[index] = h * heightScale; p.push((x / sx - 0.5) * faoxomValue(width, 10), heights[index], (z / sz - 0.5) * faoxomValue(depth, 10)); n.push(0, 1, 0); u.push(x / sx, z / sz); } for (var zz = 0; zz < sz; zz++) for (var xx = 0; xx < sx; xx++) { var a = zz * (sx + 1) + xx; var b = a + 1; var c = a + sx + 1; var d = c + 1; ind.push(a, c, b, b, c, d); } g.attributes = faoxomGeometry(p, n, u, ind).attributes; g.index = new Uint32Array(ind); g.computeVertexNormals(); super(g, options.material || new StandardMaterial()); this.type = "Terrain"; this.width = faoxomValue(width, 10); this.depth = faoxomValue(depth, 10); this.segmentsX = sx; this.segmentsZ = sz; this.heights = heights; this.lodLevels = options.lodLevels || []; this.heightScale = heightScale; this.rebuild(); }
    rebuild() { var p = this.geometry.attributes.position.array; for (var z = 0; z <= this.segmentsZ; z++) for (var x = 0; x <= this.segmentsX; x++) { var i = z * (this.segmentsX + 1) + x; p[i * 3 + 1] = this.heights[i]; } this.geometry.computeVertexNormals(); this.geometry.computeBoundingBox(); this.geometry.computeBoundingSphere(); return this; }
    indexAt(x, z) { return faoxomClamp(Math.round(z), 0, this.segmentsZ) * (this.segmentsX + 1) + faoxomClamp(Math.round(x), 0, this.segmentsX); }
    getHeight(x, z) { var fx = faoxomClamp(x / this.width + 0.5, 0, 1) * this.segmentsX; var fz = faoxomClamp(z / this.depth + 0.5, 0, 1) * this.segmentsZ; var x0 = Math.floor(fx); var z0 = Math.floor(fz); var x1 = Math.min(this.segmentsX, x0 + 1); var z1 = Math.min(this.segmentsZ, z0 + 1); var tx = fx - x0; var tz = fz - z0; var h00 = this.heights[this.indexAt(x0, z0)], h10 = this.heights[this.indexAt(x1, z0)], h01 = this.heights[this.indexAt(x0, z1)], h11 = this.heights[this.indexAt(x1, z1)]; return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz; }
    setHeight(x, z, value) { this.heights[this.indexAt(x, z)] = value; return this.rebuild(); }
    addHeight(x, z, value) { return this.setHeight(x, z, this.heights[this.indexAt(x, z)] + value); }
    smooth(radius) { radius = Math.max(1, Math.floor(faoxomValue(radius, 1))); var out = new Float32Array(this.heights.length); for (var z = 0; z <= this.segmentsZ; z++) for (var x = 0; x <= this.segmentsX; x++) { var sum = 0, count = 0; for (var dz = -radius; dz <= radius; dz++) for (var dx = -radius; dx <= radius; dx++) { var xx = faoxomClamp(x + dx, 0, this.segmentsX); var zz = faoxomClamp(z + dz, 0, this.segmentsZ); sum += this.heights[this.indexAt(xx, zz)]; count++; } out[this.indexAt(x, z)] = sum / count; } this.heights = out; return this.rebuild(); }
    exportHeightmap() { return { width: this.segmentsX + 1, height: this.segmentsZ + 1, values: Array.prototype.slice.call(this.heights) }; }
    importHeightmap(data) { if (!data || !data.values) return this; this.heights = new Float32Array(data.values); return this.rebuild(); }
}
class TerrainManager { constructor() { this.terrains = []; } add(terrain) { if (this.terrains.indexOf(terrain) === -1) this.terrains.push(terrain); return terrain; } remove(terrain) { var i = this.terrains.indexOf(terrain); if (i !== -1) this.terrains.splice(i, 1); } getHeight(x, z) { var h = -Infinity; for (var i = 0; i < this.terrains.length; i++) h = Math.max(h, this.terrains[i].getHeight(x, z)); return h; } }

function faoxomPointInTriangle(p, a, b, c) { var v0 = c.clone().sub(a); var v1 = b.clone().sub(a); var v2 = p.clone().sub(a); var dot00 = v0.dot(v0); var dot01 = v0.dot(v1); var dot02 = v0.dot(v2); var dot11 = v1.dot(v1); var dot12 = v1.dot(v2); var inv = 1 / (dot00 * dot11 - dot01 * dot01 || 1); var u = (dot11 * dot02 - dot01 * dot12) * inv; var v = (dot00 * dot12 - dot01 * dot02) * inv; return u >= 0 && v >= 0 && u + v <= 1; }
class Navmesh {
    constructor(geometry, options) { this.vertices = []; this.triangles = []; this.adjacency = []; this.cache = {}; this.build(geometry, options); }
    build(geometry) { if (!geometry) return this; var a = geometry.getAttribute ? geometry.getAttribute("position") : null; if (!a) return this; for (var i = 0; i < a.array.length; i += a.itemSize) this.vertices.push(new Vector3(a.array[i], a.array[i + 1], a.array[i + 2])); var index = geometry.index; var count = index ? index.length : this.vertices.length; for (var j = 0; j < count; j += 3) this.triangles.push([index ? index[j] : j, index ? index[j + 1] : j + 1, index ? index[j + 2] : j + 2]); this.buildAdjacency(); return this; }
    buildAdjacency() { this.adjacency = this.triangles.map(function() { return []; }); var edges = {}; for (var i = 0; i < this.triangles.length; i++) { var triangle = this.triangles[i]; for (var e = 0; e < 3; e++) { var a = triangle[e]; var b = triangle[(e + 1) % 3]; var key = a < b ? a + ":" + b : b + ":" + a; if (!edges[key]) edges[key] = []; edges[key].push(i); } } for (var key in edges) { var list = edges[key]; for (var j = 0; j < list.length; j++) for (var k = j + 1; k < list.length; k++) { var first = list[j]; var second = list[k]; if (this.adjacency[first].indexOf(second) === -1) this.adjacency[first].push(second); if (this.adjacency[second].indexOf(first) === -1) this.adjacency[second].push(first); } } return this; }
    triangleCenter(index) { var t = this.triangles[index]; return new Vector3().add(this.vertices[t[0]]).add(this.vertices[t[1]]).add(this.vertices[t[2]]).multiplyScalar(1 / 3); }
    locateTriangle(point) { for (var i = 0; i < this.triangles.length; i++) { var t = this.triangles[i]; if (faoxomPointInTriangle(point, this.vertices[t[0]], this.vertices[t[1]], this.vertices[t[2]])) return i; } return -1; }
    findPath(start, end) { var startIndex = this.locateTriangle(start); var endIndex = this.locateTriangle(end); if (startIndex < 0 || endIndex < 0) return []; if (startIndex === endIndex) return [start.clone(), end.clone()]; var open = [startIndex]; var came = {}; var g = {}; var f = {}; g[startIndex] = 0; f[startIndex] = this.triangleCenter(startIndex).distanceTo(this.triangleCenter(endIndex)); while (open.length) { open.sort(function(a, b) { return f[a] - f[b]; }); var current = open.shift(); if (current === endIndex) { var ids = [current]; while (came[current] !== undefined) { current = came[current]; ids.unshift(current); } var path = [start.clone()]; for (var k = 1; k < ids.length; k++) path.push(this.triangleCenter(ids[k])); path.push(end.clone()); return this.smoothPath(path); } for (var n = 0; n < this.adjacency[current].length; n++) { var neighbor = this.adjacency[current][n]; var score = g[current] + this.triangleCenter(current).distanceTo(this.triangleCenter(neighbor)); if (g[neighbor] === undefined || score < g[neighbor]) { came[neighbor] = current; g[neighbor] = score; f[neighbor] = score + this.triangleCenter(neighbor).distanceTo(this.triangleCenter(endIndex)); if (open.indexOf(neighbor) === -1) open.push(neighbor); } } } return []; }
    smoothPath(path) { if (path.length <= 2) return path; var out = [path[0]]; for (var i = 1; i < path.length - 1; i++) { if (path[i - 1].distanceTo(path[i + 1]) > path[i - 1].distanceTo(path[i]) + path[i].distanceTo(path[i + 1]) - 0.001) out.push(path[i]); } out.push(path[path.length - 1]); return out; }
}
class Pathfinder { constructor(navmesh) { this.navmesh = navmesh; } findPath(start, end) { return this.navmesh ? this.navmesh.findPath(start, end) : []; } }
class NavmeshManager { constructor() { this.navmeshes = []; } add(navmesh) { this.navmeshes.push(navmesh); return navmesh; } remove(navmesh) { var i = this.navmeshes.indexOf(navmesh); if (i !== -1) this.navmeshes.splice(i, 1); } findPath(start, end) { return this.navmeshes.length ? this.navmeshes[0].findPath(start, end) : []; } }

class InputManager {
    constructor(element) { this.element = element || (typeof window !== "undefined" ? window : null); this.keys = {}; this.previousKeys = {}; this.mouse = { x: 0, y: 0, deltaX: 0, deltaY: 0, buttons: 0, wheel: 0 }; this.pointer = { x: 0, y: 0, down: false, locked: false }; this.touches = {}; this.gamepads = []; this.callbacks = {}; this.listeners = []; this.bind(); }
    bind() { var el = this.element; if (!el || !el.addEventListener) return; var self = this; var listen = function(target, type, fn) { if (!target || !target.addEventListener) return; target.addEventListener(type, fn); self.listeners.push({ target: target, type: type, fn: fn }); }; listen(el, "keydown", function(e) { self.keys[e.code || e.key] = true; self.emit("keydown", e); }); listen(el, "keyup", function(e) { self.keys[e.code || e.key] = false; self.emit("keyup", e); }); listen(el, "mousemove", function(e) { self.mouse.deltaX += e.movementX || 0; self.mouse.deltaY += e.movementY || 0; self.mouse.x = e.clientX || 0; self.mouse.y = e.clientY || 0; self.pointer.x = self.mouse.x; self.pointer.y = self.mouse.y; self.emit("mousemove", e); }); listen(el, "mousedown", function(e) { self.mouse.buttons = e.buttons; self.pointer.down = true; self.emit("mousedown", e); }); listen(el, "mouseup", function(e) { self.mouse.buttons = e.buttons; self.pointer.down = false; self.emit("mouseup", e); }); listen(el, "wheel", function(e) { self.mouse.wheel += e.deltaY || 0; self.emit("wheel", e); }); listen(el, "pointerdown", function(e) { self.pointer.down = true; self.pointer.x = e.clientX || 0; self.pointer.y = e.clientY || 0; self.mouse.buttons = e.buttons || 1; self.emit("pointerdown", e); }); listen(el, "pointerup", function(e) { self.pointer.down = false; self.mouse.buttons = e.buttons || 0; self.emit("pointerup", e); }); listen(el, "pointermove", function(e) { self.pointer.x = e.clientX || 0; self.pointer.y = e.clientY || 0; self.mouse.deltaX += e.movementX || 0; self.mouse.deltaY += e.movementY || 0; self.emit("pointermove", e); }); listen(el, "touchstart", function(e) { self.pointer.down = true; self.touches = e.touches || {}; self.emit("touchstart", e); }); listen(el, "touchmove", function(e) { self.touches = e.touches || {}; self.emit("touchmove", e); }); listen(el, "touchend", function(e) { self.pointer.down = false; self.touches = e.touches || {}; self.emit("touchend", e); }); if (typeof document !== "undefined") listen(document, "pointerlockchange", function() { self.pointer.locked = document.pointerLockElement === el; self.emit("pointerlockchange", self.pointer.locked); }); }
    on(event, callback) { if (!this.callbacks[event]) this.callbacks[event] = []; this.callbacks[event].push(callback); return this; }
    off(event, callback) { var a = this.callbacks[event] || []; var i = a.indexOf(callback); if (i !== -1) a.splice(i, 1); return this; }
    emit(event, value) { var a = this.callbacks[event] || []; for (var i = 0; i < a.length; i++) a[i](value, this); }
    isKeyDown(key) { return !!this.keys[key]; }
    wasKeyPressed(key) { return !!this.keys[key] && !this.previousKeys[key]; }
    wasKeyReleased(key) { return !this.keys[key] && !!this.previousKeys[key]; }
    requestPointerLock() { if (this.element && this.element.requestPointerLock) this.element.requestPointerLock(); return this; }
    exitPointerLock() { if (typeof document !== "undefined" && document.exitPointerLock) document.exitPointerLock(); return this; }
    update() { this.previousKeys = {}; for (var key in this.keys) this.previousKeys[key] = this.keys[key]; this.mouse.deltaX = 0; this.mouse.deltaY = 0; this.mouse.wheel = 0; if (typeof navigator !== "undefined" && typeof navigator.getGamepads === "function") this.gamepads = Array.prototype.slice.call(navigator.getGamepads() || []); }
    destroy() { for (var i = 0; i < this.listeners.length; i++) { var item = this.listeners[i]; if (item.target && item.target.removeEventListener) item.target.removeEventListener(item.type, item.fn); } this.listeners = []; this.callbacks = {}; }
}

class WebGLRenderer {
    constructor(options) { options = options || {}; this.canvas = options.canvas || null; if (!this.canvas && typeof document !== "undefined") { this.canvas = document.createElement("canvas"); if (options.append !== false && document.body) document.body.appendChild(this.canvas); } this.context = null; this.gl = null; this.pixelRatio = faoxomValue(options.pixelRatio, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1); this.width = 1; this.height = 1; this.clearColor = new Color(faoxomValue(options.clearColor, 0x000000)); this.clearAlpha = faoxomValue(options.clearAlpha, 1); this.programCache = {}; this.bufferCache = typeof WeakMap !== "undefined" ? new WeakMap() : null; this.textureCache = typeof WeakMap !== "undefined" ? new WeakMap() : null; this.renderQueue = []; this.shadowMap = { enabled: false, size: 1024, type: "pcf" }; this.info = { render: { calls: 0, triangles: 0, frame: 0 } }; this.initContext(options); }
    initContext(options) { if (!this.canvas || !this.canvas.getContext) return; this.gl = this.canvas.getContext("webgl2", options) || this.canvas.getContext("webgl", options) || this.canvas.getContext("experimental-webgl", options); this.context = this.gl; if (this.gl && typeof window !== "undefined") window._faoxomGL = this.gl; if (this.canvas.clientWidth || this.canvas.clientHeight) this.setSize(this.canvas.clientWidth || 1, this.canvas.clientHeight || 1, false); }
    setPixelRatio(ratio) { this.pixelRatio = ratio; return this.resize(this.width, this.height); }
    setSize(width, height, updateStyle) { this.width = Math.max(1, width); this.height = Math.max(1, height); if (this.canvas) { this.canvas.width = Math.floor(this.width * this.pixelRatio); this.canvas.height = Math.floor(this.height * this.pixelRatio); if (updateStyle !== false && this.canvas.style) { this.canvas.style.width = this.width + "px"; this.canvas.style.height = this.height + "px"; } } if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height); return this; }
    resize(width, height) { return this.setSize(width || this.width, height || this.height, true); }
    setClearColor(color, alpha) { this.clearColor.set(color); if (alpha !== undefined) this.clearAlpha = alpha; if (this.gl) this.gl.clearColor(this.clearColor.r, this.clearColor.g, this.clearColor.b, this.clearAlpha); return this; }
    compileShader(type, source) { var gl = this.gl; if (!gl) return null; var shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; } return shader; }
    getProgram(material) { var gl = this.gl; if (!gl) return null; var key = material.type + (material.wireframe ? "w" : "s"); if (this.programCache[key]) return this.programCache[key]; var vertex = "attribute vec3 position; attribute vec3 normal; attribute vec2 uv; attribute vec3 colorAttribute; uniform mat4 modelMatrix; uniform mat4 viewMatrix; uniform mat4 projectionMatrix; uniform mat3 normalMatrix; varying vec3 vNormal; varying vec3 vPosition; varying vec2 vUv; varying vec3 vColor; void main(){ vec4 world = modelMatrix * vec4(position,1.0); vPosition = world.xyz; vNormal = normalize(normalMatrix * normal); vUv = uv; vColor = colorAttribute; gl_Position = projectionMatrix * viewMatrix * world; }"; var fragment = "precision mediump float; uniform vec3 color; uniform vec3 emissive; uniform float opacity; uniform vec3 cameraPosition; uniform int lightCount; uniform vec3 lightPosition[8]; uniform vec3 lightColor[8]; uniform vec3 lightGroundColor[8]; uniform float lightIntensity[8]; uniform float lightDistance[8]; uniform int lightType[8]; uniform sampler2D diffuseMap; uniform int useDiffuseMap; uniform int fogEnabled; uniform vec3 fogColor; uniform float fogNear; uniform float fogFar; varying vec3 vNormal; varying vec3 vPosition; varying vec2 vUv; varying vec3 vColor; void main(){ vec3 n=normalize(vNormal); vec3 base=color*vColor; if(useDiffuseMap==1) base*=texture2D(diffuseMap,vUv).rgb; vec3 lit=emissive+base*0.08; for(int i=0;i<8;i++){ if(i>=lightCount) break; if(lightType[i]==0){ lit+=base*lightColor[i]*lightIntensity[i]; } else { vec3 l; float attenuation=1.0; if(lightType[i]==1){ l=normalize(-lightPosition[i]); } else { vec3 delta=lightPosition[i]-vPosition; float distanceToLight=length(delta); l=normalize(delta); if(lightDistance[i]>0.0) attenuation=max(0.0,1.0-distanceToLight/lightDistance[i]); attenuation*=1.0/(1.0+distanceToLight*distanceToLight*0.015); } float diffuse=max(dot(n,l),0.0); if(lightType[i]==4){ float hemi=n.y*0.5+0.5; lit+=base*mix(lightGroundColor[i],lightColor[i],hemi)*lightIntensity[i]*attenuation; } else { lit+=base*lightColor[i]*diffuse*lightIntensity[i]*attenuation; } } } if(fogEnabled==1){ float fogFactor=clamp((fogFar-length(cameraPosition-vPosition))/(fogFar-fogNear),0.0,1.0); lit=mix(fogColor,lit,fogFactor); } gl_FragColor=vec4(lit,opacity); }"; var vs = this.compileShader(gl.VERTEX_SHADER, vertex); var fs = this.compileShader(gl.FRAGMENT_SHADER, fragment); if (!vs || !fs) return null; var program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.bindAttribLocation(program, 0, "position"); gl.bindAttribLocation(program, 1, "normal"); gl.bindAttribLocation(program, 2, "uv"); gl.bindAttribLocation(program, 3, "colorAttribute"); gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null; program.uniforms = {}; var uniformNames = ["modelMatrix", "viewMatrix", "projectionMatrix", "normalMatrix", "color", "emissive", "opacity", "cameraPosition", "lightCount", "diffuseMap", "useDiffuseMap", "fogEnabled", "fogColor", "fogNear", "fogFar"]; for (var i = 0; i < 8; i++) uniformNames.push("lightPosition[" + i + "]", "lightColor[" + i + "]", "lightGroundColor[" + i + "]", "lightIntensity[" + i + "]", "lightDistance[" + i + "]", "lightType[" + i + "]"); for (var j = 0; j < uniformNames.length; j++) program.uniforms[uniformNames[j]] = gl.getUniformLocation(program, uniformNames[j]); this.programCache[key] = program; return program; }
    getBuffer(geometry, name, attribute) { var gl = this.gl; if (!gl) return null; var cache = this.bufferCache ? this.bufferCache.get(geometry) : null; if (!cache) { cache = {}; if (this.bufferCache) this.bufferCache.set(geometry, cache); } if (cache[name]) return cache[name]; var buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, attribute.array, gl.STATIC_DRAW); cache[name] = buffer; return buffer; }
    getIndexBuffer(geometry, indices) { var gl = this.gl; var cache = this.bufferCache ? this.bufferCache.get(geometry) : null; if (!cache) { cache = {}; if (this.bufferCache) this.bufferCache.set(geometry, cache); } var key = indices === geometry.index ? "index" : "wireIndex"; if (cache[key]) return cache[key]; cache[key] = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cache[key]); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW); return cache[key]; }
    getWireframeIndex(geometry) { var cache = this.bufferCache ? this.bufferCache.get(geometry) : null; if (cache && cache.wireData) return cache.wireData; var index = geometry.index; var lines = []; if (index) for (var i = 0; i < index.length; i += 3) { var a = index[i], b = index[i + 1], c = index[i + 2]; lines.push(a, b, b, c, c, a); } else { var count = geometry.attributes.position.array.length / geometry.attributes.position.itemSize; for (var j = 0; j < count; j += 3) lines.push(j, j + 1, j + 1, j + 2, j + 2, j); } var data = lines.length > 65535 ? new Uint32Array(lines) : new Uint16Array(lines); if (!cache) { cache = {}; if (this.bufferCache) this.bufferCache.set(geometry, cache); } cache.wireData = data; return data; }
    getTexture(texture) { var gl = this.gl; if (!gl || !texture) return null; var cached = this.textureCache ? this.textureCache.get(texture) : null; if (cached && !texture.needsUpdate) return cached; var handle = cached || gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, handle); var image = texture.image; if (image && image.width && image.height) { if (texture.flipY && gl.pixelStorei) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); } else { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255])); } var wrap = function(value) { return value === "clamp" ? gl.CLAMP_TO_EDGE : value === "mirror" ? gl.MIRRORED_REPEAT : gl.REPEAT; }; var filter = function(value) { return value === "nearest" ? gl.NEAREST : gl.LINEAR; }; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap(texture.wrapS)); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap(texture.wrapT)); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter(texture.minFilter)); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter(texture.magFilter)); if (texture.minFilter && texture.minFilter.indexOf("mipmap") !== -1 && gl.generateMipmap) gl.generateMipmap(gl.TEXTURE_2D); gl.bindTexture(gl.TEXTURE_2D, null); if (this.textureCache) this.textureCache.set(texture, handle); texture.needsUpdate = false; return handle; }
    collect(scene, camera) { var self = this; this.renderQueue = []; scene.traverseVisible(function(object) { if (!(object instanceof Mesh) || !object.geometry || !object.material) return; object.updateMatrixWorld(true); if (object.frustumCulled && object.geometry.boundingSphere) { var center = object.geometry.boundingSphere.center.clone().applyMatrix4(object.matrixWorld); var clip = center.clone().applyMatrix4(camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse)); if (clip.z < -1.2 || clip.z > 1.2 || clip.x < -1.5 || clip.x > 1.5 || clip.y < -1.5 || clip.y > 1.5) return; } var item = { object: object, distance: camera.position.distanceTo(new Vector3().setFromMatrixPosition(object.matrixWorld)), order: object.renderOrder + object.material.renderOrder, transparent: !!object.material.transparent }; self.renderQueue.push(item); }); this.renderQueue.sort(function(a, b) { if (a.transparent !== b.transparent) return a.transparent ? 1 : -1; return a.transparent ? b.distance - a.distance : a.order - b.order || a.distance - b.distance; }); return this.renderQueue; }
    draw(mesh, camera, lights, fog) { var gl = this.gl; var material = mesh.material; var geometry = mesh.geometry; var program = this.getProgram(material); if (!program) return; var u = program.uniforms; gl.useProgram(program); if (material.depthTest) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST); gl.depthMask(material.depthWrite !== false && !material.transparent); if (material.transparent) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); } else gl.disable(gl.BLEND); if (material.side === "double") gl.disable(gl.CULL_FACE); else { gl.enable(gl.CULL_FACE); gl.cullFace(material.side === "back" ? gl.FRONT : gl.BACK); } var attrs = geometry.attributes; var position = attrs.position; var normal = attrs.normal; var uv = attrs.uv; var colors = attrs.color || attrs.colors; if (position) { gl.bindBuffer(gl.ARRAY_BUFFER, this.getBuffer(geometry, "position", position)); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, position.itemSize, gl.FLOAT, !!position.normalized, 0, 0); } if (normal) { gl.bindBuffer(gl.ARRAY_BUFFER, this.getBuffer(geometry, "normal", normal)); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, normal.itemSize, gl.FLOAT, !!normal.normalized, 0, 0); } else gl.disableVertexAttribArray(1); if (uv) { gl.bindBuffer(gl.ARRAY_BUFFER, this.getBuffer(geometry, "uv", uv)); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, uv.itemSize, gl.FLOAT, !!uv.normalized, 0, 0); } else gl.disableVertexAttribArray(2); if (colors) { gl.bindBuffer(gl.ARRAY_BUFFER, this.getBuffer(geometry, "color", colors)); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, colors.itemSize, gl.FLOAT, !!colors.normalized, 0, 0); } else { gl.disableVertexAttribArray(3); if (gl.vertexAttrib3f) gl.vertexAttrib3f(3, 1, 1, 1); } var normalMatrix = mesh.matrixWorld.clone().invert().transpose().elements; var normalValues = new Float32Array([normalMatrix[0], normalMatrix[1], normalMatrix[2], normalMatrix[4], normalMatrix[5], normalMatrix[6], normalMatrix[8], normalMatrix[9], normalMatrix[10]]); if (u.modelMatrix) gl.uniformMatrix4fv(u.modelMatrix, false, mesh.matrixWorld.elements); if (u.viewMatrix) gl.uniformMatrix4fv(u.viewMatrix, false, camera.matrixWorldInverse.elements); if (u.projectionMatrix) gl.uniformMatrix4fv(u.projectionMatrix, false, camera.projectionMatrix.elements); if (u.normalMatrix && gl.uniformMatrix3fv) gl.uniformMatrix3fv(u.normalMatrix, false, normalValues); if (u.color) gl.uniform3f(u.color, material.color.r, material.color.g, material.color.b); if (u.emissive) gl.uniform3f(u.emissive, material.emissive.r, material.emissive.g, material.emissive.b); if (u.opacity) gl.uniform1f(u.opacity, material.opacity); if (u.cameraPosition) gl.uniform3f(u.cameraPosition, camera.position.x, camera.position.y, camera.position.z); var map = material.diffuseMap || null; if (u.useDiffuseMap) gl.uniform1i(u.useDiffuseMap, map ? 1 : 0); if (map) { var handle = this.getTexture(map); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, handle); if (u.diffuseMap) gl.uniform1i(u.diffuseMap, 0); } if (u.fogEnabled) gl.uniform1i(u.fogEnabled, fog ? 1 : 0); if (fog) { if (u.fogColor) gl.uniform3f(u.fogColor, fog.color && fog.color.r !== undefined ? fog.color.r : 0.5, fog.color && fog.color.g !== undefined ? fog.color.g : 0.5, fog.color && fog.color.b !== undefined ? fog.color.b : 0.5); if (u.fogNear) gl.uniform1f(u.fogNear, faoxomValue(fog.near, 1)); if (u.fogFar) gl.uniform1f(u.fogFar, faoxomValue(fog.far, 1000)); } if (u.lightCount) gl.uniform1i(u.lightCount, lights.length); for (var j = 0; j < lights.length; j++) { var light = lights[j]; var lp = new Vector3().setFromMatrixPosition(light.matrixWorld); var type = light.type === "AmbientLight" ? 0 : light.type === "DirectionalLight" ? 1 : light.type === "HemisphereLight" ? 4 : 2; var pos = u["lightPosition[" + j + "]"]; var col = u["lightColor[" + j + "]"]; var ground = u["lightGroundColor[" + j + "]"]; var inten = u["lightIntensity[" + j + "]"]; var dist = u["lightDistance[" + j + "]"]; var typ = u["lightType[" + j + "]"]; if (pos) gl.uniform3f(pos, lp.x, lp.y, lp.z); if (col) gl.uniform3f(col, light.color.r, light.color.g, light.color.b); if (ground) { var gc = light.groundColor || new Color(0x444444); gl.uniform3f(ground, gc.r, gc.g, gc.b); } if (inten) gl.uniform1f(inten, light.intensity); if (dist) gl.uniform1f(dist, light.distance || 0); if (typ) gl.uniform1i(typ, type); } var indices = material.wireframe ? this.getWireframeIndex(geometry) : geometry.index; var mode = material.wireframe ? gl.LINES : gl.TRIANGLES; if (indices) { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.getIndexBuffer(geometry, indices)); var indexType = indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT; gl.drawElements(mode, indices.length, indexType, 0); this.info.render.triangles += Math.floor(indices.length / 3); } else if (position) { var count = position.array.length / position.itemSize; gl.drawArrays(material.wireframe ? gl.LINES : gl.TRIANGLES, 0, count); this.info.render.triangles += Math.floor(count / 3); } this.info.render.calls++; }
    render(scene, camera) { if (!scene || !camera) return; scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); if (!this.gl) return; var gl = this.gl; this.info.render.calls = 0; this.info.render.triangles = 0; this.info.render.frame++; gl.depthMask(true); this.setClearColor(scene.background && scene.background.color ? scene.background.color : this.clearColor, scene.background && scene.background.alpha !== undefined ? scene.background.alpha : this.clearAlpha); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); var queue = this.collect(scene, camera); var lights = []; scene.traverseVisible(function(o) { if (o instanceof Light && lights.length < 8) lights.push(o); }); var fog = scene.fog; for (var i = 0; i < queue.length; i++) this.draw(queue[i].object, camera, lights, fog); gl.depthMask(true); }
    renderShadowMap(scene, lights) { return !!(this.shadowMap.enabled && scene && lights && lights.length); }
    dispose() { this.programCache = {}; this.renderQueue = []; }
}

class AssetLoader {
    constructor(options) { this.options = options || {}; this.cache = {}; this.inflight = {}; }
    load(url, type) { var key = url + "|" + (type || ""); if (this.cache[key]) return Promise.resolve(this.cache[key]); if (this.inflight[key]) return this.inflight[key]; var self = this; var ext = (url.split(".").pop() || "").toLowerCase().split("?")[0]; var kind = type || (ext === "gltf" || ext === "glb" || ext === "obj" ? "model" : ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp" ? "texture" : ext === "mp3" || ext === "wav" || ext === "ogg" ? "audio" : ext === "json" ? "json" : "text"); var promise; if (kind === "texture") promise = new Texture(url).promise.then(function(t) { self.cache[key] = t; return t; }); else if (kind === "audio") promise = Promise.resolve(typeof Audio !== "undefined" ? new Audio(url) : { src: url }); else promise = fetch(url).then(function(response) { if (!response.ok) throw new Error("Asset request failed"); return kind === "json" || ext === "gltf" ? response.json() : response.text(); }).then(function(data) { var result = kind === "model" ? self.parseModel(data, ext) : data; self.cache[key] = result; return result; }); this.inflight[key] = promise; return promise.then(function(value) { delete self.inflight[key]; return value; }, function(error) { delete self.inflight[key]; throw error; }); }
    parseModel(data, ext) { if (ext === "obj" && typeof data === "string") return this.parseOBJ(data); if (data && data.asset) return data; return data; }
    parseOBJ(text) { var positions = [], normals = [], uvs = [], outP = [], outN = [], outU = [], indices = [], map = {}; var lines = text.split(/\r?\n/); for (var i = 0; i < lines.length; i++) { var line = lines[i].trim(); var parts = line.split(/\s+/); if (parts[0] === "v") positions.push(new Vector3(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]))); else if (parts[0] === "vn") normals.push(new Vector3(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]))); else if (parts[0] === "vt") uvs.push(new Vector2(parseFloat(parts[1]), parseFloat(parts[2]))); else if (parts[0] === "f") { var face = []; for (var j = 1; j < parts.length; j++) { var key = parts[j]; if (map[key] === undefined) { var refs = key.split("/"); var pi = parseInt(refs[0], 10); var ti = parseInt(refs[1] || 0, 10); var ni = parseInt(refs[2] || 0, 10); var pv = positions[pi < 0 ? positions.length + pi : pi - 1] || new Vector3(); var tv = uvs[ti < 0 ? uvs.length + ti : ti - 1] || new Vector2(); var nv = normals[ni < 0 ? normals.length + ni : ni - 1] || new Vector3(0, 1, 0); outP.push(pv.x, pv.y, pv.z); outU.push(tv.x, tv.y); outN.push(nv.x, nv.y, nv.z); map[key] = outP.length / 3 - 1; } face.push(map[key]); } for (var k = 1; k < face.length - 1; k++) indices.push(face[0], face[k], face[k + 1]); } } return new Mesh(faoxomGeometry(outP, outN, outU, indices), new StandardMaterial()); }
    loadModel(url) { return this.load(url, "model"); }
    loadTexture(url) { return this.load(url, "texture"); }
    loadAudio(url) { return this.load(url, "audio"); }
}

class FaoxomJs {
    constructor(options) { this.options = options || {}; this.scenes = {}; this.activeScene = null; this.renderer = null; this.physics = new PhysicsWorld(this.options.physics); this.input = null; this.animationManager = new AnimationManager(); this.navmeshManager = new NavmeshManager(); this.terrainManager = new TerrainManager(); this.assetLoader = new AssetLoader(this.options.assets); this.running = false; this.frameHandle = null; this.time = 0; this.deltaTime = 0; this.fps = 0; this.lastTime = 0; this.readyCallbacks = []; this.background = null; this.initialized = false; }
    init(options) { if (options) for (var key in options) this.options[key] = options[key]; this.renderer = new WebGLRenderer(this.options.renderer || this.options); this.input = new InputManager(this.options.inputElement || (this.renderer && this.renderer.canvas)); if (this.options.width && this.options.height) this.renderer.setSize(this.options.width, this.options.height); this.createScene("main"); this.initialized = true; for (var i = 0; i < this.readyCallbacks.length; i++) this.readyCallbacks[i](this); this.readyCallbacks = []; return this; }
    start() { if (!this.initialized) this.init(); if (this.running) return this; this.running = true; this.lastTime = typeof performance !== "undefined" ? performance.now() : Date.now(); var self = this; var loop = function(now) { if (!self.running) return; self.update(((now || Date.now()) - self.lastTime) / 1000); self.lastTime = now || Date.now(); self.render(); if (typeof requestAnimationFrame !== "undefined") self.frameHandle = requestAnimationFrame(loop); else self.frameHandle = setTimeout(function() { loop(typeof performance !== "undefined" ? performance.now() : Date.now()); }, 16); }; if (typeof requestAnimationFrame !== "undefined") this.frameHandle = requestAnimationFrame(loop); else this.frameHandle = setTimeout(function() { loop(typeof performance !== "undefined" ? performance.now() : Date.now()); }, 16); return this; }
    stop() { this.running = false; if (this.frameHandle !== null) { if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(this.frameHandle); else clearTimeout(this.frameHandle); this.frameHandle = null; } return this; }
    update(delta) { this.deltaTime = Math.max(0, Math.min(delta || 0, 0.25)); this.time += this.deltaTime; this.fps = this.deltaTime > 0 ? 1 / this.deltaTime : 0; if (this.input) this.input.update(); this.physics.step(this.deltaTime); this.animationManager.update(this.deltaTime); return this; }
    render() { if (this.renderer && this.activeScene) { var camera = this.activeScene.activeCamera || this.activeScene.camera; if (!camera) { this.activeScene.traverse(function(o) { if (!camera && o instanceof Camera) camera = o; }); } if (camera) this.renderer.render(this.activeScene, camera); } return this; }
    createScene(name) { var scene = new Scene(); scene.name = name || "scene" + Object.keys(this.scenes).length; this.scenes[scene.name] = scene; if (!this.activeScene) this.activeScene = scene; return scene; }
    setActiveScene(scene) { this.activeScene = typeof scene === "string" ? this.scenes[scene] : scene; return this; }
    getScene(name) { return this.scenes[name]; }
    removeScene(name) { var scene = typeof name === "string" ? this.scenes[name] : name; if (!scene) return this; delete this.scenes[scene.name]; if (this.activeScene === scene) this.activeScene = null; scene.destroy(); return this; }
    createMesh(geometry, material) { return new Mesh(geometry, material); }
    createBox(width, height, depth, material) { return new Mesh(new BoxGeometry(width, height, depth), material || new StandardMaterial()); }
    createSphere(radius, widthSegments, heightSegments, material) { return new Mesh(new SphereGeometry(radius, widthSegments, heightSegments), material || new StandardMaterial()); }
    createPlane(width, height, material) { return new Mesh(new PlaneGeometry(width, height), material || new StandardMaterial()); }
    createCylinder(radiusTop, radiusBottom, height, material) { return new Mesh(new CylinderGeometry(radiusTop, radiusBottom, height), material || new StandardMaterial()); }
    createCone(radius, height, material) { return new Mesh(new ConeGeometry(radius, height), material || new StandardMaterial()); }
    createTorus(radius, tube, material) { return new Mesh(new TorusGeometry(radius, tube), material || new StandardMaterial()); }
    createTorusKnot(radius, tube, material) { return new Mesh(new TorusKnotGeometry(radius, tube), material || new StandardMaterial()); }
    createIcosahedron(radius, detail, material) { return new Mesh(new IcosahedronGeometry(radius, detail), material || new StandardMaterial()); }
    createDodecahedron(radius, detail, material) { return new Mesh(new DodecahedronGeometry(radius, detail), material || new StandardMaterial()); }
    createOctahedron(radius, detail, material) { return new Mesh(new OctahedronGeometry(radius, detail), material || new StandardMaterial()); }
    createTetrahedron(radius, detail, material) { return new Mesh(new TetrahedronGeometry(radius, detail), material || new StandardMaterial()); }
    createRing(innerRadius, outerRadius, material) { return new Mesh(new RingGeometry(innerRadius, outerRadius), material || new StandardMaterial()); }
    createLathe(points, segments, material) { return new Mesh(new LatheGeometry(points, segments), material || new StandardMaterial()); }
    createExtrude(shape, depth, material) { return new Mesh(new ExtrudeGeometry(shape, depth), material || new StandardMaterial()); }
    createShape(points) { return new Shape(points); }
    createMaterial(options) { return new Material(options); }
    createStandardMaterial(options) { return new StandardMaterial(options); }
    createPhongMaterial(options) { return new PhongMaterial(options); }
    createLambertMaterial(options) { return new LambertMaterial(options); }
    createBasicMaterial(options) { return new BasicMaterial(options); }
    createTexture(source, options) { return new Texture(source, options); }
    createCubeTexture(sources, options) { return new CubeTexture(sources, options); }
    createAmbientLight(color, intensity) { return new AmbientLight(color, intensity); }
    createDirectionalLight(color, intensity) { return new DirectionalLight(color, intensity); }
    createPointLight(color, intensity, distance, decay) { return new PointLight(color, intensity, distance, decay); }
    createSpotLight(color, intensity, distance, angle, penumbra, decay) { return new SpotLight(color, intensity, distance, angle, penumbra, decay); }
    createHemisphereLight(skyColor, groundColor, intensity) { return new HemisphereLight(skyColor, groundColor, intensity); }
    createRectAreaLight(color, intensity, width, height) { return new RectAreaLight(color, intensity, width, height); }
    createCamera(options) { options = options || {}; return new PerspectiveCamera(options.fov, options.aspect, options.near, options.far); }
    createOrthographicCamera(left, right, top, bottom, near, far) { return new OrthographicCamera(left, right, top, bottom, near, far); }
    createPerspectiveCamera(fov, aspect, near, far) { return new PerspectiveCamera(fov, aspect, near, far); }
    createNode() { return new Node(); }
    createGroup() { return new Group(); }
    createSkeleton(bones, inverses) { return new Skeleton(bones, inverses); }
    createBone() { return new Bone(); }
    createSkinnedMesh(geometry, material) { return new SkinnedMesh(geometry, material); }
    createAnimationClip(name, duration, tracks) { return new AnimationClip(name, duration, tracks); }
    createAnimationTrack(name, times, values, type, interpolation) { return new AnimationTrack(name, times, values, type, interpolation); }
    createAnimationController(target) { var controller = new AnimationController(target); this.animationManager.add(controller); return controller; }
    createRigidBody(options) { var body = new RigidBody(options); this.physics.addBody(body); return body; }
    createCollisionShape(type, options) { return new CollisionShape(type, options); }
    createTerrain(width, depth, segmentsX, segmentsZ, options) { var terrain = new Terrain(width, depth, segmentsX, segmentsZ, options); this.terrainManager.add(terrain); return terrain; }
    createNavmesh(geometry, options) { var navmesh = new Navmesh(geometry, options); this.navmeshManager.add(navmesh); return navmesh; }
    createPathfinder(navmesh) { return new Pathfinder(navmesh || this.navmeshManager.navmeshes[0]); }
    loadModel(url) { return this.assetLoader.loadModel(url); }
    loadTexture(url) { return this.assetLoader.loadTexture(url); }
    loadAudio(url) { return this.assetLoader.loadAudio(url); }
    getTime() { return this.time; }
    getDeltaTime() { return this.deltaTime; }
    getFPS() { return this.fps; }
    resize(width, height) { if (this.renderer) { if (width === undefined && typeof window !== "undefined") width = window.innerWidth; if (height === undefined && typeof window !== "undefined") height = window.innerHeight; this.renderer.resize(width, height); } return this; }
    setClearColor(color, alpha) { if (this.renderer) this.renderer.setClearColor(color, alpha); return this; }
    setBackground(background) { this.background = background; if (this.activeScene) this.activeScene.background = background; return this; }
    setFog(fog) { if (this.activeScene) this.activeScene.fog = fog; return this; }
    enableShadows(enabled) { if (this.renderer) this.renderer.shadowMap.enabled = enabled !== false; return this; }
    setShadowMapSize(size) { if (this.renderer) this.renderer.shadowMap.size = size; return this; }
    getRenderer() { return this.renderer; }
    getPhysics() { return this.physics; }
    getInput() { return this.input; }
    getAnimationManager() { return this.animationManager; }
    getNavmeshManager() { return this.navmeshManager; }
    getTerrainManager() { return this.terrainManager; }
    onReady(callback) { if (this.initialized) callback(this); else this.readyCallbacks.push(callback); return this; }
    destroy() { this.stop(); if (this.input) this.input.destroy(); for (var key in this.scenes) this.scenes[key].destroy(); this.scenes = {}; if (this.renderer) this.renderer.dispose(); this.renderer = null; this.activeScene = null; }
}

FaoxomJs.Vector2 = Vector2;
FaoxomJs.Vector3 = Vector3;
FaoxomJs.Vector4 = Vector4;
FaoxomJs.Euler = Euler;
FaoxomJs.Quaternion = Quaternion;
FaoxomJs.Matrix4 = Matrix4;
FaoxomJs.Box3 = Box3;
FaoxomJs.Sphere = Sphere;
FaoxomJs.Plane = Plane;
FaoxomJs.Ray = Ray;
FaoxomJs.Color = Color;
FaoxomJs.Object3D = Object3D;
FaoxomJs.Node = Node;
FaoxomJs.Group = Group;
FaoxomJs.Scene = Scene;
FaoxomJs.Mesh = Mesh;
FaoxomJs.Geometry = Geometry;
FaoxomJs.BoxGeometry = BoxGeometry;
FaoxomJs.SphereGeometry = SphereGeometry;
FaoxomJs.PlaneGeometry = PlaneGeometry;
FaoxomJs.CylinderGeometry = CylinderGeometry;
FaoxomJs.ConeGeometry = ConeGeometry;
FaoxomJs.TorusGeometry = TorusGeometry;
FaoxomJs.TorusKnotGeometry = TorusKnotGeometry;
FaoxomJs.IcosahedronGeometry = IcosahedronGeometry;
FaoxomJs.DodecahedronGeometry = DodecahedronGeometry;
FaoxomJs.OctahedronGeometry = OctahedronGeometry;
FaoxomJs.TetrahedronGeometry = TetrahedronGeometry;
FaoxomJs.RingGeometry = RingGeometry;
FaoxomJs.LatheGeometry = LatheGeometry;
FaoxomJs.ExtrudeGeometry = ExtrudeGeometry;
FaoxomJs.Shape = Shape;
FaoxomJs.Material = Material;
FaoxomJs.StandardMaterial = StandardMaterial;
FaoxomJs.PhongMaterial = PhongMaterial;
FaoxomJs.LambertMaterial = LambertMaterial;
FaoxomJs.BasicMaterial = BasicMaterial;
FaoxomJs.Texture = Texture;
FaoxomJs.CubeTexture = CubeTexture;
FaoxomJs.Light = Light;
FaoxomJs.AmbientLight = AmbientLight;
FaoxomJs.DirectionalLight = DirectionalLight;
FaoxomJs.PointLight = PointLight;
FaoxomJs.SpotLight = SpotLight;
FaoxomJs.HemisphereLight = HemisphereLight;
FaoxomJs.RectAreaLight = RectAreaLight;
FaoxomJs.Camera = Camera;
FaoxomJs.PerspectiveCamera = PerspectiveCamera;
FaoxomJs.OrthographicCamera = OrthographicCamera;
FaoxomJs.Bone = Bone;
FaoxomJs.Skeleton = Skeleton;
FaoxomJs.SkinnedMesh = SkinnedMesh;
FaoxomJs.AnimationClip = AnimationClip;
FaoxomJs.AnimationTrack = AnimationTrack;
FaoxomJs.AnimationController = AnimationController;
FaoxomJs.AnimationManager = AnimationManager;
FaoxomJs.CollisionShape = CollisionShape;
FaoxomJs.RigidBody = RigidBody;
FaoxomJs.DistanceConstraint = DistanceConstraint;
FaoxomJs.FixedConstraint = FixedConstraint;
FaoxomJs.PhysicsWorld = PhysicsWorld;
FaoxomJs.Terrain = Terrain;
FaoxomJs.TerrainManager = TerrainManager;
FaoxomJs.Navmesh = Navmesh;
FaoxomJs.Pathfinder = Pathfinder;
FaoxomJs.NavmeshManager = NavmeshManager;
FaoxomJs.InputManager = InputManager;
FaoxomJs.WebGLRenderer = WebGLRenderer;
FaoxomJs.AssetLoader = AssetLoader;

if (typeof window !== "undefined") window.FaoxomJs = FaoxomJs;
export default FaoxomJs;
