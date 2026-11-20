import { Quaternion } from "./Quaternion.js";

import { faoxomclamp } from "./faoxomclamp.js";

import { faoxomvalue } from "./faoxomvalue.js";

class Vector3 {
    constructor(zaowa, zaowb, zaowc) {
        this.x = faoxomvalue(zaowa, 0);
        this.y = faoxomvalue(zaowb, 0);
        this.z = faoxomvalue(zaowc, 0);
    }
    set(zaowa, zaowb, zaowc) {
        this.x = zaowa;
        this.y = zaowb;
        this.z = zaowc;
        return this;
    }
    setX(zaowa) {
        this.x = zaowa;
        return this;
    }
    setY(zaowa) {
        this.y = zaowa;
        return this;
    }
    setZ(zaowa) {
        this.z = zaowa;
        return this;
    }
    setScalar(zaowa) {
        this.x = zaowa;
        this.y = zaowa;
        this.z = zaowa;
        return this;
    }
    clone() {
        return new Vector3(this.x, this.y, this.z);
    }
    copy(zaowa) {
        this.x = zaowa.x;
        this.y = zaowa.y;
        this.z = zaowa.z;
        return this;
    }
    add(zaowa) {
        this.x += zaowa.x;
        this.y += zaowa.y;
        this.z += zaowa.z;
        return this;
    }
    addScalar(zaowa) {
        this.x += zaowa;
        this.y += zaowa;
        this.z += zaowa;
        return this;
    }
    addScaledVector(zaowa, zaowb) {
        this.x += zaowa.x * zaowb;
        this.y += zaowa.y * zaowb;
        this.z += zaowa.z * zaowb;
        return this;
    }
    addVectors(zaowa, zaowb) {
        this.x = zaowa.x + zaowb.x;
        this.y = zaowa.y + zaowb.y;
        this.z = zaowa.z + zaowb.z;
        return this;
    }
    sub(zaowa) {
        this.x -= zaowa.x;
        this.y -= zaowa.y;
        this.z -= zaowa.z;
        return this;
    }
    subVectors(zaowa, zaowb) {
        this.x = zaowa.x - zaowb.x;
        this.y = zaowa.y - zaowb.y;
        this.z = zaowa.z - zaowb.z;
        return this;
    }
    multiply(zaowa) {
        this.x *= zaowa.x;
        this.y *= zaowa.y;
        this.z *= zaowa.z;
        return this;
    }
    multiplyScalar(zaowa) {
        this.x *= zaowa;
        this.y *= zaowa;
        this.z *= zaowa;
        return this;
    }
    divideScalar(zaowa) {
        return this.multiplyScalar(zaowa === 0 ? 0 : 1 / zaowa);
    }
    negate() {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }
    dot(zaowa) {
        return this.x * zaowa.x + this.y * zaowa.y + this.z * zaowa.z;
    }
    cross(zaowa) {
        return this.crossVectors(this, zaowa);
    }
    crossVectors(zaowa, zaowb) {
        var zaowc = zaowa.x;
        var zaowd = zaowa.y;
        var zaowe = zaowa.z;
        var zaowf = zaowb.x;
        var zaowg = zaowb.y;
        var zaowh = zaowb.z;
        this.x = zaowd * zaowh - zaowe * zaowg;
        this.y = zaowe * zaowf - zaowc * zaowh;
        this.z = zaowc * zaowg - zaowd * zaowf;
        return this;
    }
    lengthSq() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    length() {
        return Math.sqrt(this.lengthSq());
    }
    normalize() {
        return this.divideScalar(this.length() || 1);
    }
    distanceTo(zaowa) {
        return Math.sqrt(this.distanceToSquared(zaowa));
    }
    distanceToSquared(zaowa) {
        var zaowb = this.x - zaowa.x;
        var zaowc = this.y - zaowa.y;
        var zaowd = this.z - zaowa.z;
        return zaowb * zaowb + zaowc * zaowc + zaowd * zaowd;
    }
    lerp(zaowa, zaowb) {
        this.x += (zaowa.x - this.x) * zaowb;
        this.y += (zaowa.y - this.y) * zaowb;
        this.z += (zaowa.z - this.z) * zaowb;
        return this;
    }
    lerpVectors(zaowa, zaowb, zaowc) {
        this.x = zaowa.x + (zaowb.x - zaowa.x) * zaowc;
        this.y = zaowa.y + (zaowb.y - zaowa.y) * zaowc;
        this.z = zaowa.z + (zaowb.z - zaowa.z) * zaowc;
        return this;
    }
    applyMatrix4(zaowa) {
        var zaowb = zaowa.elements;
        var zaowc = this.x;
        var zaowd = this.y;
        var zaowe = this.z;
        var zaowf = zaowb[3] * zaowc + zaowb[7] * zaowd + zaowb[11] * zaowe + zaowb[15];
        zaowf = zaowf || 1;
        this.x = (zaowb[0] * zaowc + zaowb[4] * zaowd + zaowb[8] * zaowe + zaowb[12]) / zaowf;
        this.y = (zaowb[1] * zaowc + zaowb[5] * zaowd + zaowb[9] * zaowe + zaowb[13]) / zaowf;
        this.z = (zaowb[2] * zaowc + zaowb[6] * zaowd + zaowb[10] * zaowe + zaowb[14]) / zaowf;
        return this;
    }
    transformDirection(zaowa) {
        var zaowb = zaowa.elements;
        var zaowc = this.x;
        var zaowd = this.y;
        var zaowe = this.z;
        this.x = zaowb[0] * zaowc + zaowb[4] * zaowd + zaowb[8] * zaowe;
        this.y = zaowb[1] * zaowc + zaowb[5] * zaowd + zaowb[9] * zaowe;
        this.z = zaowb[2] * zaowc + zaowb[6] * zaowd + zaowb[10] * zaowe;
        return this.normalize();
    }
    applyQuaternion(zaowa) {
        var zaowb = this.x;
        var zaowc = this.y;
        var zaowd = this.z;
        var zaowe = zaowa.x;
        var zaowf = zaowa.y;
        var zaowg = zaowa.z;
        var zaowh = zaowa.w;
        var zaowi = zaowh * zaowb + zaowf * zaowd - zaowg * zaowc;
        var zaowj = zaowh * zaowc + zaowg * zaowb - zaowe * zaowd;
        var zaowk = zaowh * zaowd + zaowe * zaowc - zaowf * zaowb;
        var zaowl = -zaowe * zaowb - zaowf * zaowc - zaowg * zaowd;
        this.x = zaowi * zaowh + zaowl * -zaowe + zaowj * -zaowg - zaowk * -zaowf;
        this.y = zaowj * zaowh + zaowl * -zaowf + zaowk * -zaowe - zaowi * -zaowg;
        this.z = zaowk * zaowh + zaowl * -zaowg + zaowi * -zaowf - zaowj * -zaowe;
        return this;
    }
    applyAxisAngle(zaowa, zaowb) {
        return this.applyQuaternion((new Quaternion).setFromAxisAngle(zaowa, zaowb));
    }
    setFromMatrixPosition(zaowa) {
        var zaowb = zaowa.elements;
        this.x = zaowb[12];
        this.y = zaowb[13];
        this.z = zaowb[14];
        return this;
    }
    setFromMatrixScale(zaowa) {
        var zaowb = zaowa.elements;
        this.x = Math.hypot(zaowb[0], zaowb[1], zaowb[2]);
        this.y = Math.hypot(zaowb[4], zaowb[5], zaowb[6]);
        this.z = Math.hypot(zaowb[8], zaowb[9], zaowb[10]);
        return this;
    }
    project(zaowa) {
        return this.applyMatrix4(zaowa.matrixWorldInverse).applyMatrix4(zaowa.projectionMatrix);
    }
    unproject(zaowa) {
        return this.applyMatrix4(zaowa.projectionMatrixInverse).applyMatrix4(zaowa.matrixWorld);
    }
    fromArray(zaowa, zaowb) {
        var zaowc = faoxomvalue(zaowb, 0);
        this.x = zaowa[zaowc] || 0;
        this.y = zaowa[zaowc + 1] || 0;
        this.z = zaowa[zaowc + 2] || 0;
        return this;
    }
    toArray(zaowa, zaowb) {
        var zaowc = zaowa || [];
        var zaowd = faoxomvalue(zaowb, 0);
        zaowc[zaowd] = this.x;
        zaowc[zaowd + 1] = this.y;
        zaowc[zaowd + 2] = this.z;
        return zaowc;
    }
    equals(zaowa) {
        return this.x === zaowa.x && this.y === zaowa.y && this.z === zaowa.z;
    }
}

Vector3.prototype.min = function(zaowa) {
    this.x = Math.min(this.x, zaowa.x);
    this.y = Math.min(this.y, zaowa.y);
    this.z = Math.min(this.z, zaowa.z);
    return this;
};

Vector3.prototype.max = function(zaowa) {
    this.x = Math.max(this.x, zaowa.x);
    this.y = Math.max(this.y, zaowa.y);
    this.z = Math.max(this.z, zaowa.z);
    return this;
};

Vector3.prototype.setLength = function(zaowa) {
    return this.normalize().multiplyScalar(zaowa);
};

Vector3.prototype.clampLength = function(zaowa, zaowb) {
    var zaowc = this.length();
    return this.multiplyScalar(zaowc === 0 ? 1 : faoxomclamp(zaowc, zaowa, zaowb) / zaowc);
};

Vector3.prototype.projectOnVector = function(zaowa) {
    var zaowb = zaowa.lengthSq();
    if (zaowb === 0) return this.set(0, 0, 0);
    return this.copy(zaowa).multiplyScalar(this.dot(zaowa) / zaowb);
};

Vector3.prototype.projectOnPlane = function(zaowa) {
    var zaowb = this.clone().projectOnVector(zaowa);
    return this.sub(zaowb);
};

Vector3.prototype.reflect = function(zaowa) {
    return this.sub(zaowa.clone().multiplyScalar(2 * this.dot(zaowa)));
};

Vector3.prototype.manhattanDistanceTo = function(zaowa) {
    return Math.abs(this.x - zaowa.x) + Math.abs(this.y - zaowa.y) + Math.abs(this.z - zaowa.z);
};

Vector3.prototype.angleTo = function(zaowa) {
    return Math.acos(faoxomclamp(this.dot(zaowa) / (this.length() * zaowa.length() || 1), -1, 1));
};

Vector3.prototype.setFromEuler = function(zaowa) {
    return this.copy(new Vector3(0, 0, -1).applyQuaternion((new Quaternion).setFromEuler(zaowa)));
};

Vector3.prototype.applyNormalMatrix = function(zaowa) {
    return this.applyMatrix3(zaowa).normalize();
};

Vector3.prototype.applyMatrix3 = function(zaowa) {
    var zaowb = zaowa.elements, zaowc = this.x, zaowd = this.y, zaowe = this.z;
    this.x = zaowb[0] * zaowc + zaowb[3] * zaowd + zaowb[6] * zaowe;
    this.y = zaowb[1] * zaowc + zaowb[4] * zaowd + zaowb[7] * zaowe;
    this.z = zaowb[2] * zaowc + zaowb[5] * zaowd + zaowb[8] * zaowe;
    return this;
};

Vector3.prototype.setFromBufferAttribute = function(zaowa, zaowb) {
    return this.set(zaowa.getX ? zaowa.getX(zaowb) : zaowa.array[zaowb * zaowa.itemSize], zaowa.getY ? zaowa.getY(zaowb) : zaowa.array[zaowb * zaowa.itemSize + 1], zaowa.getZ ? zaowa.getZ(zaowb) : zaowa.array[zaowb * zaowa.itemSize + 2]);
};

export { Vector3 };
