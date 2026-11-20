import { Quaternion } from "./Quaternion.js";

import { Vector3 } from "./Vector3.js";

import { faoxomvalue } from "./faoxomvalue.js";

class Matrix4 {
    constructor() {
        this.elements = new Float64Array(16);
        this.identity();
    }
    set(zaoga, zaogb, zaogc, zaogd, zaoge, zaogf, zaogg, zaogh, zaogi, zaogj, zaogk, zaogl, zaogm, zaogn, zaogo, zaogp) {
        var zaogq = this.elements;
        zaogq[0] = zaoga;
        zaogq[4] = zaogb;
        zaogq[8] = zaogc;
        zaogq[12] = zaogd;
        zaogq[1] = zaoge;
        zaogq[5] = zaogf;
        zaogq[9] = zaogg;
        zaogq[13] = zaogh;
        zaogq[2] = zaogi;
        zaogq[6] = zaogj;
        zaogq[10] = zaogk;
        zaogq[14] = zaogl;
        zaogq[3] = zaogm;
        zaogq[7] = zaogn;
        zaogq[11] = zaogo;
        zaogq[15] = zaogp;
        return this;
    }
    identity() {
        return this.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    }
    clone() {
        return (new Matrix4).fromArray(this.elements);
    }
    copy(zaoga) {
        this.elements.set(zaoga.elements);
        return this;
    }
    fromArray(zaoga, zaogb) {
        var zaogc = faoxomvalue(zaogb, 0);
        for (var zaogd = 0; zaogd < 16; zaogd++) this.elements[zaogd] = zaoga[zaogc + zaogd];
        return this;
    }
    toArray(zaoga, zaogb) {
        var zaogc = zaoga || [];
        var zaogd = faoxomvalue(zaogb, 0);
        for (var zaoge = 0; zaoge < 16; zaoge++) zaogc[zaogd + zaoge] = this.elements[zaoge];
        return zaogc;
    }
    multiply(zaoga) {
        return this.multiplyMatrices(this, zaoga);
    }
    premultiply(zaoga) {
        return this.multiplyMatrices(zaoga, this);
    }
    multiplyMatrices(zaoga, zaogb) {
        var zaogc = zaoga.elements, zaogd = zaogb.elements, zaoge = this.elements;
        var zaogf = zaogc[0], zaogg = zaogc[4], zaogh = zaogc[8], zaogi = zaogc[12], zaogj = zaogc[1], zaogk = zaogc[5], zaogl = zaogc[9], zaogm = zaogc[13], zaogn = zaogc[2], zaogo = zaogc[6], zaogp = zaogc[10], zaogq = zaogc[14], zaogr = zaogc[3], zaogs = zaogc[7], zaogt = zaogc[11], zaogu = zaogc[15];
        var zaogv = zaogd[0], zaogw = zaogd[4], zaogx = zaogd[8], zaogy = zaogd[12], zaogz = zaogd[1], zaogaa = zaogd[5], zaogab = zaogd[9], zaogac = zaogd[13], zaogad = zaogd[2], zaogae = zaogd[6], zaogaf = zaogd[10], zaogag = zaogd[14], zaogah = zaogd[3], zaogai = zaogd[7], zaogaj = zaogd[11], zaogak = zaogd[15];
        zaoge[0] = zaogf * zaogv + zaogg * zaogz + zaogh * zaogad + zaogi * zaogah;
        zaoge[4] = zaogf * zaogw + zaogg * zaogaa + zaogh * zaogae + zaogi * zaogai;
        zaoge[8] = zaogf * zaogx + zaogg * zaogab + zaogh * zaogaf + zaogi * zaogaj;
        zaoge[12] = zaogf * zaogy + zaogg * zaogac + zaogh * zaogag + zaogi * zaogak;
        zaoge[1] = zaogj * zaogv + zaogk * zaogz + zaogl * zaogad + zaogm * zaogah;
        zaoge[5] = zaogj * zaogw + zaogk * zaogaa + zaogl * zaogae + zaogm * zaogai;
        zaoge[9] = zaogj * zaogx + zaogk * zaogab + zaogl * zaogaf + zaogm * zaogaj;
        zaoge[13] = zaogj * zaogy + zaogk * zaogac + zaogl * zaogag + zaogm * zaogak;
        zaoge[2] = zaogn * zaogv + zaogo * zaogz + zaogp * zaogad + zaogq * zaogah;
        zaoge[6] = zaogn * zaogw + zaogo * zaogaa + zaogp * zaogae + zaogq * zaogai;
        zaoge[10] = zaogn * zaogx + zaogo * zaogab + zaogp * zaogaf + zaogq * zaogaj;
        zaoge[14] = zaogn * zaogy + zaogo * zaogac + zaogp * zaogag + zaogq * zaogak;
        zaoge[3] = zaogr * zaogv + zaogs * zaogz + zaogt * zaogad + zaogu * zaogah;
        zaoge[7] = zaogr * zaogw + zaogs * zaogaa + zaogt * zaogae + zaogu * zaogai;
        zaoge[11] = zaogr * zaogx + zaogs * zaogab + zaogt * zaogaf + zaogu * zaogaj;
        zaoge[15] = zaogr * zaogy + zaogs * zaogac + zaogt * zaogag + zaogu * zaogak;
        return this;
    }
    determinant() {
        var zaoga = this.elements;
        var zaogb = zaoga[0], zaogc = zaoga[4], zaogd = zaoga[8], zaoge = zaoga[12], zaogf = zaoga[1], zaogg = zaoga[5], zaogh = zaoga[9], zaogi = zaoga[13], zaogj = zaoga[2], zaogk = zaoga[6], zaogl = zaoga[10], zaogm = zaoga[14], zaogn = zaoga[3], zaogo = zaoga[7], zaogp = zaoga[11], zaogq = zaoga[15];
        return zaogn * (zaoge * zaogh * zaogk - zaogd * zaogi * zaogk - zaoge * zaogg * zaogl + zaogc * zaogi * zaogl + zaogd * zaogg * zaogm - zaogc * zaogh * zaogm) + zaogo * (zaogb * zaogh * zaogm - zaogb * zaogi * zaogl + zaoge * zaogf * zaogl - zaogd * zaogf * zaogm + zaogd * zaogi * zaogj - zaoge * zaogh * zaogj) + zaogp * (zaogb * zaogi * zaogk - zaogb * zaogg * zaogm - zaoge * zaogf * zaogk + zaogc * zaogf * zaogm + zaoge * zaogg * zaogj - zaogc * zaogi * zaogj) + zaogq * (-zaogd * zaogg * zaogj - zaogb * zaogh * zaogk + zaogb * zaogg * zaogl + zaogd * zaogf * zaogk - zaogc * zaogf * zaogl + zaogc * zaogh * zaogj);
    }
    invert() {
        var zaoga = this.elements;
        var zaogb = zaoga[0], zaogc = zaoga[1], zaogd = zaoga[2], zaoge = zaoga[3], zaogf = zaoga[4], zaogg = zaoga[5], zaogh = zaoga[6], zaogi = zaoga[7], zaogj = zaoga[8], zaogk = zaoga[9], zaogl = zaoga[10], zaogm = zaoga[11], zaogn = zaoga[12], zaogo = zaoga[13], zaogp = zaoga[14], zaogq = zaoga[15];
        var zaogr = zaogb * zaogg - zaogc * zaogf, zaogs = zaogb * zaogh - zaogd * zaogf, zaogt = zaogb * zaogi - zaoge * zaogf, zaogu = zaogc * zaogh - zaogd * zaogg, zaogv = zaogc * zaogi - zaoge * zaogg, zaogw = zaogd * zaogi - zaoge * zaogh, zaogx = zaogj * zaogo - zaogk * zaogn, zaogy = zaogj * zaogp - zaogl * zaogn, zaogz = zaogj * zaogq - zaogm * zaogn, zaogaa = zaogk * zaogp - zaogl * zaogo, zaogab = zaogk * zaogq - zaogm * zaogo, zaogac = zaogl * zaogq - zaogm * zaogp;
        var zaogad = zaogr * zaogac - zaogs * zaogab + zaogt * zaogaa + zaogu * zaogz - zaogv * zaogy + zaogw * zaogx;
        if (zaogad === 0) return this.identity();
        var zaogae = 1 / zaogad;
        var zaogaf = this.elements;
        zaogaf[0] = (zaogg * zaogac - zaogh * zaogab + zaogi * zaogaa) * zaogae;
        zaogaf[1] = (zaogd * zaogab - zaogc * zaogac - zaoge * zaogaa) * zaogae;
        zaogaf[2] = (zaogo * zaogw - zaogp * zaogv + zaogq * zaogu) * zaogae;
        zaogaf[3] = (zaogl * zaogv - zaogk * zaogw - zaogm * zaogu) * zaogae;
        zaogaf[4] = (zaogh * zaogz - zaogf * zaogac - zaogi * zaogy) * zaogae;
        zaogaf[5] = (zaogb * zaogac - zaogd * zaogz + zaoge * zaogy) * zaogae;
        zaogaf[6] = (zaogp * zaogt - zaogn * zaogw - zaogq * zaogs) * zaogae;
        zaogaf[7] = (zaogj * zaogw - zaogl * zaogt + zaogm * zaogs) * zaogae;
        zaogaf[8] = (zaogf * zaogab - zaogg * zaogz + zaogi * zaogx) * zaogae;
        zaogaf[9] = (zaogc * zaogz - zaogb * zaogab - zaoge * zaogx) * zaogae;
        zaogaf[10] = (zaogn * zaogv - zaogo * zaogt + zaogq * zaogr) * zaogae;
        zaogaf[11] = (zaogk * zaogt - zaogj * zaogv - zaogm * zaogr) * zaogae;
        zaogaf[12] = (zaogg * zaogy - zaogf * zaogaa - zaogh * zaogx) * zaogae;
        zaogaf[13] = (zaogb * zaogaa - zaogc * zaogy + zaogd * zaogx) * zaogae;
        zaogaf[14] = (zaogo * zaogs - zaogn * zaogu - zaogp * zaogr) * zaogae;
        zaogaf[15] = (zaogj * zaogu - zaogk * zaogs + zaogl * zaogr) * zaogae;
        return this;
    }
    transpose() {
        var zaoga = this.elements;
        var zaogb;
        zaogb = zaoga[1];
        zaoga[1] = zaoga[4];
        zaoga[4] = zaogb;
        zaogb = zaoga[2];
        zaoga[2] = zaoga[8];
        zaoga[8] = zaogb;
        zaogb = zaoga[6];
        zaoga[6] = zaoga[9];
        zaoga[9] = zaogb;
        zaogb = zaoga[3];
        zaoga[3] = zaoga[12];
        zaoga[12] = zaogb;
        zaogb = zaoga[7];
        zaoga[7] = zaoga[13];
        zaoga[13] = zaogb;
        zaogb = zaoga[11];
        zaoga[11] = zaoga[14];
        zaoga[14] = zaogb;
        return this;
    }
    makeTranslation(zaoga, zaogb, zaogc) {
        return this.set(1, 0, 0, zaoga, 0, 1, 0, zaogb, 0, 0, 1, zaogc, 0, 0, 0, 1);
    }
    makeScale(zaoga, zaogb, zaogc) {
        return this.set(zaoga, 0, 0, 0, 0, zaogb, 0, 0, 0, 0, zaogc, 0, 0, 0, 0, 1);
    }
    makeRotationX(zaoga) {
        var zaogb = Math.cos(zaoga), zaogc = Math.sin(zaoga);
        return this.set(1, 0, 0, 0, 0, zaogb, -zaogc, 0, 0, zaogc, zaogb, 0, 0, 0, 0, 1);
    }
    makeRotationY(zaoga) {
        var zaogb = Math.cos(zaoga), zaogc = Math.sin(zaoga);
        return this.set(zaogb, 0, zaogc, 0, 0, 1, 0, 0, -zaogc, 0, zaogb, 0, 0, 0, 0, 1);
    }
    makeRotationZ(zaoga) {
        var zaogb = Math.cos(zaoga), zaogc = Math.sin(zaoga);
        return this.set(zaogb, -zaogc, 0, 0, zaogc, zaogb, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    }
    makeRotationFromQuaternion(zaoga) {
        var zaogb = zaoga.x, zaogc = zaoga.y, zaogd = zaoga.z, zaoge = zaoga.w;
        var zaogf = zaogb + zaogb, zaogg = zaogc + zaogc, zaogh = zaogd + zaogd, zaogi = zaogb * zaogf, zaogj = zaogb * zaogg, zaogk = zaogb * zaogh, zaogl = zaogc * zaogg, zaogm = zaogc * zaogh, zaogn = zaogd * zaogh, zaogo = zaoge * zaogf, zaogp = zaoge * zaogg, zaogq = zaoge * zaogh;
        return this.set(1 - (zaogl + zaogn), zaogj - zaogq, zaogk + zaogp, 0, zaogj + zaogq, 1 - (zaogi + zaogn), zaogm - zaogo, 0, zaogk - zaogp, zaogm + zaogo, 1 - (zaogi + zaogl), 0, 0, 0, 0, 1);
    }
    compose(zaoga, zaogb, zaogc) {
        var zaogd = this.elements;
        this.makeRotationFromQuaternion(zaogb);
        zaogd[0] *= zaogc.x;
        zaogd[1] *= zaogc.x;
        zaogd[2] *= zaogc.x;
        zaogd[4] *= zaogc.y;
        zaogd[5] *= zaogc.y;
        zaogd[6] *= zaogc.y;
        zaogd[8] *= zaogc.z;
        zaogd[9] *= zaogc.z;
        zaogd[10] *= zaogc.z;
        zaogd[12] = zaoga.x;
        zaogd[13] = zaoga.y;
        zaogd[14] = zaoga.z;
        return this;
    }
    decompose(zaoga, zaogb, zaogc) {
        var zaogd = this.elements;
        var zaoge = new Vector3(zaogd[0], zaogd[1], zaogd[2]).length();
        var zaogf = new Vector3(zaogd[4], zaogd[5], zaogd[6]).length();
        var zaogg = new Vector3(zaogd[8], zaogd[9], zaogd[10]).length();
        if (this.determinant() < 0) zaoge = -zaoge;
        zaoga.set(zaogd[12], zaogd[13], zaogd[14]);
        zaogc.set(zaoge, zaogf, zaogg);
        var zaogh = this.clone();
        var zaogi = zaogh.elements;
        zaogi[0] /= zaoge;
        zaogi[1] /= zaoge;
        zaogi[2] /= zaoge;
        zaogi[4] /= zaogf;
        zaogi[5] /= zaogf;
        zaogi[6] /= zaogf;
        zaogi[8] /= zaogg;
        zaogi[9] /= zaogg;
        zaogi[10] /= zaogg;
        zaogb.setFromRotationMatrix(zaogh);
        return this;
    }
    makePerspective(zaoga, zaogb, zaogc, zaogd) {
        var zaoge = 1 / Math.tan(zaoga * Math.PI / 360);
        var zaogf = 1 / (zaogc - zaogd);
        return this.set(zaoge / zaogb, 0, 0, 0, 0, zaoge, 0, 0, 0, 0, (zaogd + zaogc) * zaogf, 2 * zaogd * zaogc * zaogf, 0, 0, -1, 0);
    }
    makeOrthographic(zaoga, zaogb, zaogc, zaogd, zaoge, zaogf) {
        var zaogg = 1 / (zaogb - zaoga), zaogh = 1 / (zaogc - zaogd), zaogi = 1 / (zaogf - zaoge), zaogj = (zaogb + zaoga) * zaogg, zaogk = (zaogc + zaogd) * zaogh, zaogl = (zaogf + zaoge) * zaogi;
        return this.set(2 * zaogg, 0, 0, -zaogj, 0, 2 * zaogh, 0, -zaogk, 0, 0, -2 * zaogi, -zaogl, 0, 0, 0, 1);
    }
    lookAt(zaoga, zaogb, zaogc) {
        var zaogd = (new Vector3).subVectors(zaoga, zaogb).normalize();
        if (zaogd.lengthSq() === 0) zaogd.z = 1;
        var zaoge = (new Vector3).crossVectors(zaogc, zaogd).normalize();
        if (zaoge.lengthSq() === 0) {
            zaogd.x += 1e-4;
            zaoge.crossVectors(zaogc, zaogd).normalize();
        }
        var zaogf = (new Vector3).crossVectors(zaogd, zaoge);
        return this.set(zaoge.x, zaogf.x, zaogd.x, zaoga.x, zaoge.y, zaogf.y, zaogd.y, zaoga.y, zaoge.z, zaogf.z, zaogd.z, zaoga.z, 0, 0, 0, 1);
    }
}

Matrix4.prototype.extractRotation = function(zaoga) {
    var zaogb = (new Vector3).setFromMatrixScale(zaoga), zaogc = zaoga.elements;
    return this.set(zaogc[0] / (zaogb.x || 1), zaogc[4] / (zaogb.y || 1), zaogc[8] / (zaogb.z || 1), 0, zaogc[1] / (zaogb.x || 1), zaogc[5] / (zaogb.y || 1), zaogc[9] / (zaogb.z || 1), 0, zaogc[2] / (zaogb.x || 1), zaogc[6] / (zaogb.y || 1), zaogc[10] / (zaogb.z || 1), 0, 0, 0, 0, 1);
};

Matrix4.prototype.makeBasis = function(zaoga, zaogb, zaogc) {
    return this.set(zaoga.x, zaogb.x, zaogc.x, 0, zaoga.y, zaogb.y, zaogc.y, 0, zaoga.z, zaogb.z, zaogc.z, 0, 0, 0, 0, 1);
};

Matrix4.prototype.multiplyScalar = function(zaoga) {
    for (var zaogb = 0; zaogb < 16; zaogb++) this.elements[zaogb] *= zaoga;
    return this;
};

Matrix4.prototype.scale = function(zaoga) {
    return this.multiply((new Matrix4).makeScale(zaoga.x, zaoga.y, zaoga.z));
};

Matrix4.prototype.setPosition = function(zaoga, zaogb, zaogc) {
    if (zaoga && zaoga.x !== undefined) return this.setPosition(zaoga.x, zaoga.y, zaoga.z);
    this.elements[12] = zaoga;
    this.elements[13] = zaogb;
    this.elements[14] = zaogc;
    return this;
};

Matrix4.prototype.getMaxScaleOnAxis = function() {
    var zaoga = this.elements;
    return Math.sqrt(Math.max(zaoga[0] * zaoga[0] + zaoga[1] * zaoga[1] + zaoga[2] * zaoga[2], zaoga[4] * zaoga[4] + zaoga[5] * zaoga[5] + zaoga[6] * zaoga[6], zaoga[8] * zaoga[8] + zaoga[9] * zaoga[9] + zaoga[10] * zaoga[10]));
};

Matrix4.prototype.extractBasis = function(zaoga, zaogb, zaogc) {
    var zaogd = this.elements;
    zaoga.set(zaogd[0], zaogd[1], zaogd[2]);
    zaogb.set(zaogd[4], zaogd[5], zaogd[6]);
    zaogc.set(zaogd[8], zaogd[9], zaogd[10]);
    return this;
};

Matrix4.prototype.makeRotationAxis = function(zaoga, zaogb) {
    return this.makeRotationFromQuaternion((new Quaternion).setFromAxisAngle(zaoga, zaogb));
};

Matrix4.prototype.makeRotationFromEuler = function(zaoga) {
    return this.makeRotationFromQuaternion((new Quaternion).setFromEuler(zaoga));
};

Matrix4.prototype.isMatrix4 = true;

export { Matrix4 };
