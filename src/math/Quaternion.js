import { Vector3 } from "./Vector3.js";

import { faoxomclamp } from "./faoxomclamp.js";

import { faoxomvalue } from "./faoxomvalue.js";

class Quaternion {
    constructor(zaona, zaonb, zaonc, zaond) {
        this._x = faoxomvalue(zaona, 0);
        this._y = faoxomvalue(zaonb, 0);
        this._z = faoxomvalue(zaonc, 0);
        this._w = zaond === undefined ? 1 : zaond;
        this.onChange = function() {};
    }
    get x() {
        return this._x;
    }
    set x(zaona) {
        this._x = zaona;
        this.onChange();
    }
    get y() {
        return this._y;
    }
    set y(zaona) {
        this._y = zaona;
        this.onChange();
    }
    get z() {
        return this._z;
    }
    set z(zaona) {
        this._z = zaona;
        this.onChange();
    }
    get w() {
        return this._w;
    }
    set w(zaona) {
        this._w = zaona;
        this.onChange();
    }
    set(zaona, zaonb, zaonc, zaond) {
        this._x = zaona;
        this._y = zaonb;
        this._z = zaonc;
        this._w = zaond;
        this.onChange();
        return this;
    }
    clone() {
        var zaona = new Quaternion(this.x, this.y, this.z, this.w);
        zaona.onChange = this.onChange;
        return zaona;
    }
    copy(zaona) {
        return this.set(zaona.x, zaona.y, zaona.z, zaona.w);
    }
    fromArray(zaona, zaonb) {
        zaonb = zaonb || 0;
        return this.set(zaona[zaonb] || 0, zaona[zaonb + 1] || 0, zaona[zaonb + 2] || 0, zaona[zaonb + 3] === undefined ? 1 : zaona[zaonb + 3]);
    }
    identity() {
        return this.set(0, 0, 0, 1);
    }
    dot(zaona) {
        return this.x * zaona.x + this.y * zaona.y + this.z * zaona.z + this.w * zaona.w;
    }
    lengthSq() {
        return this.dot(this);
    }
    length() {
        return Math.sqrt(this.lengthSq());
    }
    normalize() {
        var zaona = this.length();
        if (zaona === 0) return this.set(0, 0, 0, 1);
        return this.set(this.x / zaona, this.y / zaona, this.z / zaona, this.w / zaona);
    }
    invert() {
        return this.conjugate().normalize();
    }
    conjugate() {
        this._x = -this._x;
        this._y = -this._y;
        this._z = -this._z;
        this.onChange();
        return this;
    }
    multiply(zaona) {
        return this.multiplyQuaternions(this, zaona);
    }
    premultiply(zaona) {
        return this.multiplyQuaternions(zaona, this);
    }
    multiplyQuaternions(zaona, zaonb) {
        var zaonc = zaona.x;
        var zaond = zaona.y;
        var zaone = zaona.z;
        var zaonf = zaona.w;
        var zaong = zaonb.x;
        var zaonh = zaonb.y;
        var zaoni = zaonb.z;
        var zaonj = zaonb.w;
        this.x = zaonc * zaonj + zaonf * zaong + zaond * zaoni - zaone * zaonh;
        this.y = zaond * zaonj + zaonf * zaonh + zaone * zaong - zaonc * zaoni;
        this.z = zaone * zaonj + zaonf * zaoni + zaonc * zaonh - zaond * zaong;
        this.w = zaonf * zaonj - zaonc * zaong - zaond * zaonh - zaone * zaoni;
        this.onChange();
        return this;
    }
    setFromAxisAngle(zaona, zaonb) {
        var zaonc = zaonb * .5;
        var zaond = Math.sin(zaonc);
        return this.set(zaona.x * zaond, zaona.y * zaond, zaona.z * zaond, Math.cos(zaonc));
    }
    setFromUnitVectors(zaona, zaonb) {
        var zaonc = (new Vector3).crossVectors(zaona, zaonb);
        var zaond = zaona.dot(zaonb) + 1;
        if (zaond < 1e-6) {
            if (Math.abs(zaona.x) > Math.abs(zaona.z)) return this.set(-zaona.y, zaona.x, 0, 0).normalize();
            return this.set(0, -zaona.z, zaona.y, 0).normalize();
        }
        return this.set(zaonc.x, zaonc.y, zaonc.z, zaond).normalize();
    }
    setFromEuler(zaona) {
        var zaonb = zaona.x;
        var zaonc = zaona.y;
        var zaond = zaona.z;
        var zaone = Math.cos(zaonb / 2);
        var zaonf = Math.cos(zaonc / 2);
        var zaong = Math.cos(zaond / 2);
        var zaonh = Math.sin(zaonb / 2);
        var zaoni = Math.sin(zaonc / 2);
        var zaonj = Math.sin(zaond / 2);
        var zaonk = zaona.order || "XYZ";
        if (zaonk === "XYZ") return this.set(zaonh * zaonf * zaong + zaone * zaoni * zaonj, zaone * zaoni * zaong - zaonh * zaonf * zaonj, zaone * zaonf * zaonj + zaonh * zaoni * zaong, zaone * zaonf * zaong - zaonh * zaoni * zaonj);
        if (zaonk === "YXZ") return this.set(zaonh * zaonf * zaong + zaone * zaoni * zaonj, zaone * zaoni * zaong - zaonh * zaonf * zaonj, zaone * zaonf * zaonj - zaonh * zaoni * zaong, zaone * zaonf * zaong + zaonh * zaoni * zaonj);
        if (zaonk === "ZXY") return this.set(zaonh * zaonf * zaong - zaone * zaoni * zaonj, zaone * zaoni * zaong + zaonh * zaonf * zaonj, zaone * zaonf * zaonj + zaonh * zaoni * zaong, zaone * zaonf * zaong - zaonh * zaoni * zaonj);
        if (zaonk === "ZYX") return this.set(zaonh * zaonf * zaong - zaone * zaoni * zaonj, zaone * zaoni * zaong + zaonh * zaonf * zaonj, zaone * zaonf * zaonj - zaonh * zaoni * zaong, zaone * zaonf * zaong + zaonh * zaoni * zaonj);
        if (zaonk === "YZX") return this.set(zaonh * zaonf * zaong + zaone * zaoni * zaonj, zaone * zaoni * zaong + zaonh * zaonf * zaonj, zaone * zaonf * zaonj - zaonh * zaoni * zaong, zaone * zaonf * zaong - zaonh * zaoni * zaonj);
        return this.set(zaonh * zaonf * zaong - zaone * zaoni * zaonj, zaone * zaoni * zaong - zaonh * zaonf * zaonj, zaone * zaonf * zaonj + zaonh * zaoni * zaong, zaone * zaonf * zaong + zaonh * zaoni * zaonj);
    }
    slerp(zaona, zaonb) {
        if (zaonb <= 0) return this;
        if (zaonb >= 1) return this.copy(zaona);
        var zaonc = this.x, zaond = this.y, zaone = this.z, zaonf = this.w;
        var zaong = zaonc * zaona.x + zaond * zaona.y + zaone * zaona.z + zaonf * zaona.w;
        var zaonh = zaona.x, zaoni = zaona.y, zaonj = zaona.z, zaonk = zaona.w;
        if (zaong < 0) {
            zaong = -zaong;
            zaonh = -zaonh;
            zaoni = -zaoni;
            zaonj = -zaonj;
            zaonk = -zaonk;
        }
        if (zaong > .9995) return this.set(zaonc + zaonb * (zaonh - zaonc), zaond + zaonb * (zaoni - zaond), zaone + zaonb * (zaonj - zaone), zaonf + zaonb * (zaonk - zaonf)).normalize();
        var zaonl = Math.acos(faoxomclamp(zaong, -1, 1));
        var zaonm = Math.sin(zaonl);
        var zaonn = Math.sin((1 - zaonb) * zaonl) / zaonm;
        var zaono = Math.sin(zaonb * zaonl) / zaonm;
        return this.set(zaonc * zaonn + zaonh * zaono, zaond * zaonn + zaoni * zaono, zaone * zaonn + zaonj * zaono, zaonf * zaonn + zaonk * zaono);
    }
    setFromRotationMatrix(zaona) {
        var zaonb = zaona.elements;
        var zaonc = zaonb[0], zaond = zaonb[4], zaone = zaonb[8], zaonf = zaonb[1], zaong = zaonb[5], zaonh = zaonb[9], zaoni = zaonb[2], zaonj = zaonb[6], zaonk = zaonb[10];
        var zaonl = zaonc + zaong + zaonk;
        var zaonm;
        if (zaonl > 0) {
            zaonm = .5 / Math.sqrt(zaonl + 1);
            this.w = .25 / zaonm;
            this.x = (zaonj - zaonh) * zaonm;
            this.y = (zaone - zaoni) * zaonm;
            this.z = (zaonf - zaond) * zaonm;
        } else if (zaonc > zaong && zaonc > zaonk) {
            zaonm = 2 * Math.sqrt(1 + zaonc - zaong - zaonk);
            this.w = (zaonj - zaonh) / zaonm;
            this.x = .25 * zaonm;
            this.y = (zaond + zaonf) / zaonm;
            this.z = (zaone + zaoni) / zaonm;
        } else if (zaong > zaonk) {
            zaonm = 2 * Math.sqrt(1 + zaong - zaonc - zaonk);
            this.w = (zaone - zaoni) / zaonm;
            this.x = (zaond + zaonf) / zaonm;
            this.y = .25 * zaonm;
            this.z = (zaonh + zaonj) / zaonm;
        } else {
            zaonm = 2 * Math.sqrt(1 + zaonk - zaonc - zaong);
            this.w = (zaonf - zaond) / zaonm;
            this.x = (zaone + zaoni) / zaonm;
            this.y = (zaonh + zaonj) / zaonm;
            this.z = .25 * zaonm;
        }
        this.onChange();
        return this;
    }
}

Quaternion.prototype.angleTo = function(zaona) {
    return 2 * Math.acos(Math.abs(faoxomclamp(this.dot(zaona), -1, 1)));
};

Quaternion.prototype.rotateTowards = function(zaona, zaonb) {
    var zaonc = this.angleTo(zaona);
    if (zaonc === 0) return this;
    var zaond = Math.min(1, zaonb / zaonc);
    return this.slerp(zaona, zaond);
};

Quaternion.prototype.equals = function(zaona) {
    return this.x === zaona.x && this.y === zaona.y && this.z === zaona.z && this.w === zaona.w;
};

Quaternion.prototype.isQuaternion = true;

Quaternion.prototype.toArray = function(zaona, zaonb) {
    var zaonc = zaona || [], zaond = zaonb || 0;
    zaonc[zaond] = this.x;
    zaonc[zaond + 1] = this.y;
    zaonc[zaond + 2] = this.z;
    zaonc[zaond + 3] = this.w;
    return zaonc;
};

Quaternion.prototype.random = function() {
    var zaona = Math.random(), zaonb = Math.random(), zaonc = Math.random(), zaond = Math.sqrt(1 - zaona), zaone = Math.sqrt(zaona), zaonf = Math.PI * 2 * zaonb, zaong = Math.PI * 2 * zaonc;
    return this.set(zaond * Math.sin(zaonf), zaond * Math.cos(zaonf), zaone * Math.sin(zaong), zaone * Math.cos(zaong));
};

Quaternion.prototype.slerpQuaternions = function(zaona, zaonb, zaonc) {
    return this.copy(zaona).slerp(zaonb, zaonc);
};

export { Quaternion };
