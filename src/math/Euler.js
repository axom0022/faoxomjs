import { Matrix4 } from "./Matrix4.js";

import { Quaternion } from "./Quaternion.js";

import { faoxomclamp } from "./faoxomclamp.js";

import { faoxomvalue } from "./faoxomvalue.js";

class Euler {
    constructor(zaoda, zaodb, zaodc, zaodd, zaode) {
        this._x = faoxomvalue(zaoda, 0);
        this._y = faoxomvalue(zaodb, 0);
        this._z = faoxomvalue(zaodc, 0);
        this._order = zaodd || "XYZ";
        this.onChange = zaode || function() {};
    }
    get x() {
        return this._x;
    }
    set x(zaoda) {
        this._x = zaoda;
        this.onChange();
    }
    get y() {
        return this._y;
    }
    set y(zaoda) {
        this._y = zaoda;
        this.onChange();
    }
    get z() {
        return this._z;
    }
    set z(zaoda) {
        this._z = zaoda;
        this.onChange();
    }
    get order() {
        return this._order;
    }
    set order(zaoda) {
        this._order = zaoda || "XYZ";
        this.onChange();
    }
    set(zaoda, zaodb, zaodc, zaodd) {
        this._x = zaoda;
        this._y = zaodb;
        this._z = zaodc;
        if (zaodd) this._order = zaodd;
        this.onChange();
        return this;
    }
    clone() {
        return new Euler(this.x, this.y, this.z, this.order, this.onChange);
    }
    copy(zaoda) {
        this._x = zaoda.x;
        this._y = zaoda.y;
        this._z = zaoda.z;
        this._order = zaoda.order || "XYZ";
        this.onChange();
        return this;
    }
    setFromRotationMatrix(zaoda, zaodb) {
        var zaodc = zaoda.elements;
        var zaodd = zaodc[0], zaode = zaodc[4], zaodf = zaodc[8], zaodg = zaodc[1], zaodh = zaodc[5], zaodi = zaodc[9], zaodj = zaodc[2], zaodk = zaodc[6], zaodl = zaodc[10];
        var zaodm = zaodb || this.order || "XYZ";
        if (zaodm === "XYZ") {
            this._y = Math.asin(faoxomclamp(zaodf, -1, 1));
            if (Math.abs(zaodf) < .9999999) {
                this._x = Math.atan2(-zaodi, zaodl);
                this._z = Math.atan2(-zaode, zaodd);
            } else {
                this._x = Math.atan2(zaodk, zaodh);
                this._z = 0;
            }
        } else if (zaodm === "YXZ") {
            this._x = Math.asin(-faoxomclamp(zaodi, -1, 1));
            if (Math.abs(zaodi) < .9999999) {
                this._y = Math.atan2(zaodf, zaodl);
                this._z = Math.atan2(zaodg, zaodh);
            } else {
                this._y = Math.atan2(-zaodj, zaodd);
                this._z = 0;
            }
        } else if (zaodm === "ZXY") {
            this._x = Math.asin(faoxomclamp(zaodk, -1, 1));
            if (Math.abs(zaodk) < .9999999) {
                this._y = Math.atan2(-zaodj, zaodl);
                this._z = Math.atan2(-zaode, zaodh);
            } else {
                this._y = 0;
                this._z = Math.atan2(zaodg, zaodd);
            }
        } else if (zaodm === "ZYX") {
            this._y = Math.asin(-faoxomclamp(zaodj, -1, 1));
            if (Math.abs(zaodj) < .9999999) {
                this._x = Math.atan2(zaodk, zaodl);
                this._z = Math.atan2(zaodg, zaodd);
            } else {
                this._x = 0;
                this._z = Math.atan2(-zaode, zaodh);
            }
        } else if (zaodm === "YZX") {
            this._z = Math.asin(faoxomclamp(zaodg, -1, 1));
            if (Math.abs(zaodg) < .9999999) {
                this._x = Math.atan2(-zaodi, zaodh);
                this._y = Math.atan2(-zaodj, zaodd);
            } else {
                this._x = 0;
                this._y = Math.atan2(zaodf, zaodl);
            }
        } else if (zaodm === "XZY") {
            this._z = Math.asin(-faoxomclamp(zaode, -1, 1));
            if (Math.abs(zaode) < .9999999) {
                this._x = Math.atan2(zaodk, zaodh);
                this._y = Math.atan2(zaodf, zaodd);
            } else {
                this._x = Math.atan2(-zaodi, zaodl);
                this._y = 0;
            }
        }
        this._order = zaodm;
        this.onChange();
        return this;
    }
    setFromQuaternion(zaoda, zaodb) {
        var zaodc = (new Matrix4).makeRotationFromQuaternion(zaoda);
        return this.setFromRotationMatrix(zaodc, zaodb);
    }
}

Euler.prototype.reorder = function(zaoda) {
    return this.setFromQuaternion((new Quaternion).setFromEuler(this), zaoda);
};

Euler.prototype.toArray = function(zaoda, zaodb) {
    var zaodc = zaoda || [], zaodd = zaodb || 0;
    zaodc[zaodd] = this.x;
    zaodc[zaodd + 1] = this.y;
    zaodc[zaodd + 2] = this.z;
    zaodc[zaodd + 3] = this.order;
    return zaodc;
};

Euler.prototype.fromArray = function(zaoda, zaodb) {
    var zaodc = zaodb || 0;
    return this.set(zaoda[zaodc], zaoda[zaodc + 1], zaoda[zaodc + 2], zaoda[zaodc + 3]);
};

Euler.prototype.isEuler = true;

export { Euler };
