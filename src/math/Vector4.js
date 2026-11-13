import { faoxomvalue } from "./faoxomvalue.js";

class Vector4 {
    constructor(x, y, z, w) { this.x = faoxomvalue(x, 0); this.y = faoxomvalue(y, 0); this.z = faoxomvalue(z, 0); this.w = faoxomvalue(w, 0); }
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
    fromArray(a, offset) { var i = faoxomvalue(offset, 0); this.x = a[i] || 0; this.y = a[i + 1] || 0; this.z = a[i + 2] || 0; this.w = a[i + 3] || 0; return this; }
    toArray(a, offset) { var out = a || []; var i = faoxomvalue(offset, 0); out[i] = this.x; out[i + 1] = this.y; out[i + 2] = this.z; out[i + 3] = this.w; return out; }
}

export { Vector4 };
