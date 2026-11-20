import { Vector3 } from "./Vector3.js";

class Matrix3 {
    constructor() {
        this.elements = new Float64Array(9);
        this.identity();
    }
    set(zaofa, zaofb, zaofc, zaofd, zaofe, zaoff, zaofg, zaofh, zaofi) {
        var zaofj = this.elements;
        zaofj[0] = zaofa;
        zaofj[3] = zaofb;
        zaofj[6] = zaofc;
        zaofj[1] = zaofd;
        zaofj[4] = zaofe;
        zaofj[7] = zaoff;
        zaofj[2] = zaofg;
        zaofj[5] = zaofh;
        zaofj[8] = zaofi;
        return this;
    }
    identity() {
        return this.set(1, 0, 0, 0, 1, 0, 0, 0, 1);
    }
    clone() {
        return (new Matrix3).copy(this);
    }
    copy(zaofa) {
        this.elements.set(zaofa.elements);
        return this;
    }
    setFromMatrix4(zaofa) {
        var zaofb = zaofa.elements;
        return this.set(zaofb[0], zaofb[4], zaofb[8], zaofb[1], zaofb[5], zaofb[9], zaofb[2], zaofb[6], zaofb[10]);
    }
    multiply(zaofa) {
        return this.multiplyMatrices(this, zaofa);
    }
    premultiply(zaofa) {
        return this.multiplyMatrices(zaofa, this);
    }
    multiplyMatrices(zaofa, zaofb) {
        var zaofc = zaofa.elements, zaofd = zaofb.elements, zaofe = this.elements;
        var zaoff = zaofc[0], zaofg = zaofc[3], zaofh = zaofc[6], zaofi = zaofc[1], zaofj = zaofc[4], zaofk = zaofc[7], zaofl = zaofc[2], zaofm = zaofc[5], zaofn = zaofc[8];
        var zaofo = zaofd[0], zaofp = zaofd[3], zaofq = zaofd[6], zaofr = zaofd[1], zaofs = zaofd[4], zaoft = zaofd[7], zaofu = zaofd[2], zaofv = zaofd[5], zaofw = zaofd[8];
        zaofe[0] = zaoff * zaofo + zaofg * zaofr + zaofh * zaofu;
        zaofe[3] = zaoff * zaofp + zaofg * zaofs + zaofh * zaofv;
        zaofe[6] = zaoff * zaofq + zaofg * zaoft + zaofh * zaofw;
        zaofe[1] = zaofi * zaofo + zaofj * zaofr + zaofk * zaofu;
        zaofe[4] = zaofi * zaofp + zaofj * zaofs + zaofk * zaofv;
        zaofe[7] = zaofi * zaofq + zaofj * zaoft + zaofk * zaofw;
        zaofe[2] = zaofl * zaofo + zaofm * zaofr + zaofn * zaofu;
        zaofe[5] = zaofl * zaofp + zaofm * zaofs + zaofn * zaofv;
        zaofe[8] = zaofl * zaofq + zaofm * zaoft + zaofn * zaofw;
        return this;
    }
    makeTranslation(zaofa, zaofb) {
        return this.set(1, 0, zaofa, 0, 1, zaofb, 0, 0, 1);
    }
    makeRotation(zaofa) {
        var zaofb = Math.cos(zaofa), zaofc = Math.sin(zaofa);
        return this.set(zaofb, -zaofc, 0, zaofc, zaofb, 0, 0, 0, 1);
    }
    makeScale(zaofa, zaofb) {
        return this.set(zaofa, 0, 0, 0, zaofb, 0, 0, 0, 1);
    }
    transpose() {
        var zaofa = this.elements, zaofb;
        zaofb = zaofa[1];
        zaofa[1] = zaofa[3];
        zaofa[3] = zaofb;
        zaofb = zaofa[2];
        zaofa[2] = zaofa[6];
        zaofa[6] = zaofb;
        zaofb = zaofa[5];
        zaofa[5] = zaofa[7];
        zaofa[7] = zaofb;
        return this;
    }
    determinant() {
        var zaofa = this.elements;
        var zaofb = zaofa[0], zaofc = zaofa[1], zaofd = zaofa[2], zaofe = zaofa[3], zaoff = zaofa[4], zaofg = zaofa[5], zaofh = zaofa[6], zaofi = zaofa[7], zaofj = zaofa[8];
        return zaofb * (zaoff * zaofj - zaofg * zaofi) - zaofe * (zaofc * zaofj - zaofd * zaofi) + zaofh * (zaofc * zaofg - zaofd * zaoff);
    }
    invert() {
        var zaofa = this.elements;
        var zaofb = zaofa[0], zaofc = zaofa[1], zaofd = zaofa[2], zaofe = zaofa[3], zaoff = zaofa[4], zaofg = zaofa[5], zaofh = zaofa[6], zaofi = zaofa[7], zaofj = zaofa[8];
        var zaofk = zaofj * zaoff - zaofg * zaofi, zaofl = zaofg * zaofh - zaofj * zaofe, zaofm = zaofi * zaofe - zaoff * zaofh;
        var zaofn = zaofb * zaofk + zaofc * zaofl + zaofd * zaofm;
        if (zaofn === 0) return this.identity();
        var zaofo = 1 / zaofn;
        zaofa[0] = zaofk * zaofo;
        zaofa[1] = (zaofd * zaofi - zaofj * zaofc) * zaofo;
        zaofa[2] = (zaofg * zaofc - zaofd * zaoff) * zaofo;
        zaofa[3] = zaofl * zaofo;
        zaofa[4] = (zaofj * zaofb - zaofd * zaofh) * zaofo;
        zaofa[5] = (zaofd * zaofe - zaofg * zaofb) * zaofo;
        zaofa[6] = zaofm * zaofo;
        zaofa[7] = (zaofc * zaofh - zaofi * zaofb) * zaofo;
        zaofa[8] = (zaoff * zaofb - zaofc * zaofe) * zaofo;
        return this;
    }
    getNormalMatrix(zaofa) {
        return this.setFromMatrix4(zaofa).invert().transpose();
    }
    applyToBufferAttribute(zaofa) {
        for (var zaofb = 0; zaofb < zaofa.count; zaofb++) {
            var zaofc = new Vector3(zaofa.getX(zaofb), zaofa.getY(zaofb), zaofa.getZ(zaofb)).applyNormalMatrix(this);
            zaofa.setXYZ(zaofb, zaofc.x, zaofc.y, zaofc.z);
        }
        return zaofa;
    }
}

Matrix3.prototype.isMatrix3 = true;

export { Matrix3 };
