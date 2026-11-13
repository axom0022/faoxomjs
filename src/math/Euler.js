import { Matrix4 } from "./Matrix4.js";
import { Quaternion } from "./Quaternion.js";
import { faoxomclamp } from "./faoxomclamp.js";
import { faoxomvalue } from "./faoxomvalue.js";

class Euler {
    constructor(x, y, z, order, onChange) { this._x = faoxomvalue(x, 0); this._y = faoxomvalue(y, 0); this._z = faoxomvalue(z, 0); this._order = order || "XYZ"; this.onChange = onChange || function() {}; }
    get x() { return this._x; } set x(value) { this._x = value; this.onChange(); }
    get y() { return this._y; } set y(value) { this._y = value; this.onChange(); }
    get z() { return this._z; } set z(value) { this._z = value; this.onChange(); }
    get order() { return this._order; } set order(value) { this._order = value || "XYZ"; this.onChange(); }
    set(x, y, z, order) { this._x = x; this._y = y; this._z = z; if (order) this._order = order; this.onChange(); return this; }
    clone() { return new Euler(this.x, this.y, this.z, this.order, this.onChange); }
    copy(e) { this._x = e.x; this._y = e.y; this._z = e.z; this._order = e.order || "XYZ"; this.onChange(); return this; }
    setFromRotationMatrix(m, order) { var te = m.elements; var m11 = te[0], m12 = te[4], m13 = te[8], m21 = te[1], m22 = te[5], m23 = te[9], m31 = te[2], m32 = te[6], m33 = te[10]; var ord = order || this.order || "XYZ"; if (ord === "XYZ") { this._y = Math.asin(faoxomclamp(m13, -1, 1)); if (Math.abs(m13) < 0.9999999) { this._x = Math.atan2(-m23, m33); this._z = Math.atan2(-m12, m11); } else { this._x = Math.atan2(m32, m22); this._z = 0; } } else if (ord === "YXZ") { this._x = Math.asin(-faoxomclamp(m23, -1, 1)); if (Math.abs(m23) < 0.9999999) { this._y = Math.atan2(m13, m33); this._z = Math.atan2(m21, m22); } else { this._y = Math.atan2(-m31, m11); this._z = 0; } } else if (ord === "ZXY") { this._x = Math.asin(faoxomclamp(m32, -1, 1)); if (Math.abs(m32) < 0.9999999) { this._y = Math.atan2(-m31, m33); this._z = Math.atan2(-m12, m22); } else { this._y = 0; this._z = Math.atan2(m21, m11); } } else if (ord === "ZYX") { this._y = Math.asin(-faoxomclamp(m31, -1, 1)); if (Math.abs(m31) < 0.9999999) { this._x = Math.atan2(m32, m33); this._z = Math.atan2(m21, m11); } else { this._x = 0; this._z = Math.atan2(-m12, m22); } } else if (ord === "YZX") { this._z = Math.asin(faoxomclamp(m21, -1, 1)); if (Math.abs(m21) < 0.9999999) { this._x = Math.atan2(-m23, m22); this._y = Math.atan2(-m31, m11); } else { this._x = 0; this._y = Math.atan2(m13, m33); } } else if (ord === "XZY") { this._z = Math.asin(-faoxomclamp(m12, -1, 1)); if (Math.abs(m12) < 0.9999999) { this._x = Math.atan2(m32, m22); this._y = Math.atan2(m13, m11); } else { this._x = Math.atan2(-m23, m33); this._y = 0; } } this._order = ord; this.onChange(); return this; }
    setFromQuaternion(q, order) { var m = new Matrix4().makeRotationFromQuaternion(q); return this.setFromRotationMatrix(m, order); }
}
Euler.prototype.reorder = function(order) { return this.setFromQuaternion(new Quaternion().setFromEuler(this), order); };
Euler.prototype.toArray = function(array, offset) { var out = array || [], i = offset || 0; out[i] = this.x; out[i + 1] = this.y; out[i + 2] = this.z; out[i + 3] = this.order; return out; };
Euler.prototype.fromArray = function(array, offset) { var i = offset || 0; return this.set(array[i], array[i + 1], array[i + 2], array[i + 3]); };
Euler.prototype.isEuler = true;

export { Euler };
