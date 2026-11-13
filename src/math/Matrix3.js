import { Vector3 } from "./Vector3.js";

class Matrix3 {
    constructor() { this.elements = new Float64Array(9); this.identity(); }
    set(n11, n12, n13, n21, n22, n23, n31, n32, n33) { var e = this.elements; e[0] = n11; e[3] = n12; e[6] = n13; e[1] = n21; e[4] = n22; e[7] = n23; e[2] = n31; e[5] = n32; e[8] = n33; return this; }
    identity() { return this.set(1, 0, 0, 0, 1, 0, 0, 0, 1); }
    clone() { return new Matrix3().copy(this); }
    copy(matrix) { this.elements.set(matrix.elements); return this; }
    setFromMatrix4(matrix) { var me = matrix.elements; return this.set(me[0], me[4], me[8], me[1], me[5], me[9], me[2], me[6], me[10]); }
    multiply(matrix) { return this.multiplyMatrices(this, matrix); }
    premultiply(matrix) { return this.multiplyMatrices(matrix, this); }
    multiplyMatrices(a, b) { var ae = a.elements, be = b.elements, e = this.elements; var a11 = ae[0], a12 = ae[3], a13 = ae[6], a21 = ae[1], a22 = ae[4], a23 = ae[7], a31 = ae[2], a32 = ae[5], a33 = ae[8]; var b11 = be[0], b12 = be[3], b13 = be[6], b21 = be[1], b22 = be[4], b23 = be[7], b31 = be[2], b32 = be[5], b33 = be[8]; e[0] = a11 * b11 + a12 * b21 + a13 * b31; e[3] = a11 * b12 + a12 * b22 + a13 * b32; e[6] = a11 * b13 + a12 * b23 + a13 * b33; e[1] = a21 * b11 + a22 * b21 + a23 * b31; e[4] = a21 * b12 + a22 * b22 + a23 * b32; e[7] = a21 * b13 + a22 * b23 + a23 * b33; e[2] = a31 * b11 + a32 * b21 + a33 * b31; e[5] = a31 * b12 + a32 * b22 + a33 * b32; e[8] = a31 * b13 + a32 * b23 + a33 * b33; return this; }
    makeTranslation(x, y) { return this.set(1, 0, x, 0, 1, y, 0, 0, 1); }
    makeRotation(theta) { var c = Math.cos(theta), s = Math.sin(theta); return this.set(c, -s, 0, s, c, 0, 0, 0, 1); }
    makeScale(x, y) { return this.set(x, 0, 0, 0, y, 0, 0, 0, 1); }
    transpose() { var e = this.elements, swap; swap = e[1]; e[1] = e[3]; e[3] = swap; swap = e[2]; e[2] = e[6]; e[6] = swap; swap = e[5]; e[5] = e[7]; e[7] = swap; return this; }
    determinant() { var te = this.elements; var a = te[0], b = te[1], c = te[2], d = te[3], e = te[4], f = te[5], g = te[6], h = te[7], i = te[8]; return a * (e * i - f * h) - d * (b * i - c * h) + g * (b * f - c * e); }
    invert() { var te = this.elements; var n11 = te[0], n21 = te[1], n31 = te[2], n12 = te[3], n22 = te[4], n32 = te[5], n13 = te[6], n23 = te[7], n33 = te[8]; var t11 = n33 * n22 - n32 * n23, t12 = n32 * n13 - n33 * n12, t13 = n23 * n12 - n22 * n13; var det = n11 * t11 + n21 * t12 + n31 * t13; if (det === 0) return this.identity(); var detInv = 1 / det; te[0] = t11 * detInv; te[1] = (n31 * n23 - n33 * n21) * detInv; te[2] = (n32 * n21 - n31 * n22) * detInv; te[3] = t12 * detInv; te[4] = (n33 * n11 - n31 * n13) * detInv; te[5] = (n31 * n12 - n32 * n11) * detInv; te[6] = t13 * detInv; te[7] = (n21 * n13 - n23 * n11) * detInv; te[8] = (n22 * n11 - n21 * n12) * detInv; return this; }
    getNormalMatrix(matrix4) { return this.setFromMatrix4(matrix4).invert().transpose(); }
    applyToBufferAttribute(attribute) { for (var i = 0; i < attribute.count; i++) { var v = new Vector3(attribute.getX(i), attribute.getY(i), attribute.getZ(i)).applyNormalMatrix(this); attribute.setXYZ(i, v.x, v.y, v.z); } return attribute; }
}
Matrix3.prototype.isMatrix3 = true;

export { Matrix3 };
